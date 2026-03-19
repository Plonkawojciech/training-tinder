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
  userSportProfiles: {
    id: 'id',
    userId: 'user_id',
    sport: 'sport',
    level: 'level',
    avgSpeedKmh: 'avg_speed_kmh',
    pacePerKmSec: 'pace_per_km_sec',
    ftpWatts: 'ftp_watts',
    vo2max: 'vo2max',
    weeklyKm: 'weekly_km',
    weeklyHours: 'weekly_hours',
    restingHr: 'resting_hr',
    maxHr: 'max_hr',
    big4Json: 'big4_json',
    primaryGoal: 'primary_goal',
    yearsExperience: 'years_experience',
    updatedAt: 'updated_at',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ _eq: val })),
  and: vi.fn((...conds: unknown[]) => ({ _and: conds })),
}));

import { GET, POST } from '@/app/api/sport-profiles/route';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';

// Helpers

function makePostRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/sport-profiles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validProfileBody = {
  sport: 'running',
  level: 'competitive',
  pacePerKmSec: 270,
  weeklyKm: 60,
  maxHr: 190,
  primaryGoal: 'marathon PR',
};

const fakeProfile = {
  id: 1,
  userId: 'user-abc',
  sport: 'running',
  level: 'competitive',
  avgSpeedKmh: null,
  pacePerKmSec: 270,
  ftpWatts: null,
  vo2max: null,
  weeklyKm: 60,
  weeklyHours: null,
  restingHr: null,
  maxHr: 190,
  big4Json: {},
  primaryGoal: 'marathon PR',
  yearsExperience: null,
  updatedAt: new Date(),
};

// --- GET tests ---

describe('GET /api/sport-profiles', () => {
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

  it('returns sport profiles on success', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([fakeProfile]),
    };

    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(selectChain);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(json)).toBe(true);
    expect(json).toHaveLength(1);
    expect(json[0].sport).toBe('running');
    expect(json[0].level).toBe('competitive');
  });

  it('returns empty array when no profiles exist', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };

    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(selectChain);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual([]);
  });

  it('returns 500 when db throws', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockRejectedValue(new Error('DB connection failed')),
    };

    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(selectChain);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.code).toBe('INTERNAL_SERVER_ERROR');
  });
});

// --- POST tests ---

describe('POST /api/sport-profiles', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns 401 when not authorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await POST(makePostRequest(validProfileBody));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('validates sport field is required', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const body = { level: 'recreational' };
    const res = await POST(makePostRequest(body));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('MISSING_FIELDS');
  });

  it('creates sport profile when none exists for that sport', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    // Check for existing profile — none found
    const existingChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };

    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(existingChain);

    // Insert new profile
    const insertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([fakeProfile]),
    };

    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue(insertChain);

    const res = await POST(makePostRequest(validProfileBody));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.sport).toBe('running');
    expect(json.level).toBe('competitive');
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it('updates sport profile when one already exists for that sport', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    // Check for existing profile — found
    const existingChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([fakeProfile]),
    };

    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(existingChain);

    // Update existing profile
    const updatedProfile = { ...fakeProfile, level: 'elite' };
    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([updatedProfile]),
    };

    (db.update as ReturnType<typeof vi.fn>).mockReturnValue(updateChain);

    const res = await POST(makePostRequest({ ...validProfileBody, level: 'elite' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.level).toBe('elite');
    expect(db.update).toHaveBeenCalledTimes(1);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('returns 500 when insert throws', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    // Check for existing — none
    const existingChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };

    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(existingChain);

    const insertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockRejectedValue(new Error('DB write failed')),
    };

    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue(insertChain);

    const res = await POST(makePostRequest(validProfileBody));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.code).toBe('INTERNAL_SERVER_ERROR');
  });
});
