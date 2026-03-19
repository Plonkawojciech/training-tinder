import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---

vi.mock('@/lib/server-auth', () => ({
  getAuthUserId: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/lib/db/schema', () => ({
  users: {
    authEmail: 'clerk_id',
    username: 'username',
    ftpWatts: 'ftp_watts',
    maxHr: 'max_hr',
    pacePerKm: 'pace_per_km',
  },
  userSportProfiles: {
    id: 'id',
    userId: 'user_id',
    sport: 'sport',
    ftpWatts: 'ftp_watts',
    maxHr: 'max_hr',
    pacePerKmSec: 'pace_per_km_sec',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ _eq: val })),
}));

import { GET } from '@/app/api/training/zones/route';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';

// --- GET tests ---

describe('GET /api/training/zones', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns 401 when not authorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns zones computed from user-level data', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    // db.select().from(users).where().limit()
    const usersChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{
        authEmail: 'user-abc',
        ftpWatts: 250,
        maxHr: 185,
        pacePerKm: 300,
      }]),
    };

    // db.select().from(userSportProfiles).where()
    const profilesChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };

    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(usersChain)
      .mockReturnValueOnce(profilesChain);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ftp).toBe(250);
    expect(json.maxHr).toBe(185);
    expect(json.thresholdPaceSec).toBe(300);
    expect(json.powerZones).toHaveLength(7);
    expect(json.hrZones).toHaveLength(5);
    expect(json.paceZones).toHaveLength(5);
  });

  it('returns null zones when user has no metrics', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const usersChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{
        authEmail: 'user-abc',
        ftpWatts: null,
        maxHr: null,
        pacePerKm: null,
      }]),
    };

    const profilesChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };

    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(usersChain)
      .mockReturnValueOnce(profilesChain);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ftp).toBeNull();
    expect(json.maxHr).toBeNull();
    expect(json.thresholdPaceSec).toBeNull();
    expect(json.powerZones).toBeNull();
    expect(json.hrZones).toBeNull();
    expect(json.paceZones).toBeNull();
  });

  it('falls back to sport profile data when user-level data is null', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    // User has no direct metrics
    const usersChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{
        authEmail: 'user-abc',
        ftpWatts: null,
        maxHr: null,
        pacePerKm: null,
      }]),
    };

    // But has sport profiles with metrics
    const profilesChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        { sport: 'cycling', ftpWatts: 280, maxHr: 188, pacePerKmSec: null },
        { sport: 'running', ftpWatts: null, maxHr: 192, pacePerKmSec: 270 },
      ]),
    };

    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(usersChain)
      .mockReturnValueOnce(profilesChain);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    // FTP from cycling profile
    expect(json.ftp).toBe(280);
    // maxHr from cycling profile (checked first)
    expect(json.maxHr).toBe(188);
    // Pace from running profile
    expect(json.thresholdPaceSec).toBe(270);
    expect(json.powerZones).not.toBeNull();
    expect(json.hrZones).not.toBeNull();
    expect(json.paceZones).not.toBeNull();
  });

  it('returns 500 when db throws', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const usersChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockRejectedValue(new Error('DB connection failed')),
    };

    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(usersChain);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('handles missing user row gracefully', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    // No user row found (empty result from destructure = undefined)
    const usersChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };

    const profilesChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };

    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(usersChain)
      .mockReturnValueOnce(profilesChain);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    // All null when no user data exists
    expect(json.ftp).toBeNull();
    expect(json.maxHr).toBeNull();
    expect(json.powerZones).toBeNull();
    expect(json.hrZones).toBeNull();
    expect(json.paceZones).toBeNull();
  });

  it('computes correct power zone wattage boundaries', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const usersChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{
        authEmail: 'user-abc',
        ftpWatts: 200,
        maxHr: null,
        pacePerKm: null,
      }]),
    };

    const profilesChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };

    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(usersChain)
      .mockReturnValueOnce(profilesChain);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.powerZones).toHaveLength(7);
    // Zone 1: 0-55% of 200W = 0-110W
    expect(json.powerZones[0].minWatts).toBe(0);
    expect(json.powerZones[0].maxWatts).toBe(110);
    // Zone 2: 56-75% of 200W = 112-150W
    expect(json.powerZones[1].minWatts).toBe(112);
    expect(json.powerZones[1].maxWatts).toBe(150);
    // Zone 7 (neuromuscular) should have maxWatts = 9999
    expect(json.powerZones[6].maxWatts).toBe(9999);
  });
});
