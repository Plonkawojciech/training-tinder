import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server-auth', () => ({
  getAuthUserId: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/lib/db/schema', () => ({
  gymCheckins: {
    userId: 'user_id',
    gymName: 'gym_name',
    gymPlaceId: 'gym_place_id',
    lat: 'lat',
    lon: 'lon',
    isActive: 'is_active',
    checkedOutAt: 'checked_out_at',
    workoutType: 'workout_type',
  },
  users: {
    authEmail: 'clerk_id',
    username: 'username',
    avatarUrl: 'avatar_url',
    sportTypes: 'sport_types',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ _eq: val })),
  and: vi.fn((...conds: unknown[]) => ({ _and: conds })),
}));

import { GET, POST, DELETE } from '@/app/api/checkin/route';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';

function makePostRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/checkin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeGetRequest(params: Record<string, string> = {}): Request {
  const url = new URL('http://localhost:3000/api/checkin');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url.toString(), { method: 'GET' });
}

const fakeCheckin = {
  id: 1,
  userId: 'user-abc',
  gymName: 'CityFit Mokotów',
  gymPlaceId: 'place123',
  lat: 52.19,
  lon: 21.02,
  isActive: true,
  workoutType: 'strength',
  checkedOutAt: null,
};

describe('POST /api/checkin', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 401 when not authorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await POST(makePostRequest({ gymName: 'CityFit' }));
    expect(res.status).toBe(401);
  });

  it('creates valid checkin', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    // deactivate previous
    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(undefined),
    };
    (db.update as ReturnType<typeof vi.fn>).mockReturnValue(updateChain);
    // insert new
    const insertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([fakeCheckin]),
    };
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue(insertChain);

    const res = await POST(makePostRequest({ gymName: 'CityFit Mokotów', lat: 52.19, lng: 21.02 }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.gymName).toBe('CityFit Mokotów');
    expect(json.isActive).toBe(true);
  });

  it('returns 400 when gymName is missing', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/checkin (checkout)', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 401 when not authorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await DELETE();
    expect(res.status).toBe(401);
  });

  it('deactivates active checkins', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(undefined),
    };
    (db.update as ReturnType<typeof vi.fn>).mockReturnValue(updateChain);

    const res = await DELETE();
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

describe('GET /api/checkin', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 401 when not authorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it('returns active checkins at gym', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    // myCheckin query
    const myCheckinChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([fakeCheckin]),
    };
    // all active query with leftJoin
    const allCheckinChain = {
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        {
          checkin: fakeCheckin,
          user: { authEmail: 'user-abc', username: 'wojtek', avatarUrl: null, sportTypes: ['gym'] },
        },
      ]),
    };
    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(myCheckinChain)
      .mockReturnValueOnce(allCheckinChain);

    const res = await GET(makeGetRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.myCheckin).toBeDefined();
    expect(json.checkins).toHaveLength(1);
  });
});
