import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server-auth', () => ({
  getAuthUserId: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock('@/lib/db/schema', () => ({
  users: {
    authEmail: 'clerk_id',
    lat: 'lat',
    lon: 'lon',
  },
  matches: {
    user1Id: 'user1_id',
    user2Id: 'user2_id',
    score: 'score',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ _eq: val })),
  and: vi.fn((...conds: unknown[]) => ({ _and: conds })),
  or: vi.fn((...conds: unknown[]) => ({ _or: conds })),
  sql: vi.fn(),
}));

vi.mock('@/lib/matching', () => ({
  rankMatches: vi.fn().mockReturnValue([]),
  filterByLocation: vi.fn((matches: unknown[]) => matches),
  filterBySport: vi.fn((matches: unknown[]) => matches),
}));

import { GET, POST } from '@/app/api/matches/route';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { rankMatches } from '@/lib/matching';

function makeGetRequest(params: Record<string, string> = {}): Request {
  const url = new URL('http://localhost:3000/api/matches');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url.toString(), { method: 'GET' });
}

function makePostRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/matches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const fakeUser = {
  id: 1,
  authEmail: 'user-abc',
  username: 'wojtek',
  avatarUrl: null,
  bio: null,
  sportTypes: ['cycling', 'running'],
  pacePerKm: 300,
  weeklyKm: 50,
  city: 'Warszawa',
  lat: 52.23,
  lon: 21.01,
  gymName: null,
  strengthLevel: null,
  trainingSplits: null,
  goals: null,
};

describe('GET /api/matches', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 401 when not authorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it('returns ranked matches on success', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    // Current user query
    const userChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([fakeUser]),
    };
    // All candidates query
    const candidatesChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };

    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(userChain)
      .mockReturnValueOnce(candidatesChain);

    (rankMatches as ReturnType<typeof vi.fn>).mockReturnValue([
      { user: { ...fakeUser, id: '2' }, score: 85, breakdown: {}, distanceKm: 3 },
    ]);

    const res = await GET(makeGetRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(json)).toBe(true);
  });

  it('returns empty array when user not found', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    const res = await GET(makeGetRequest());
    const json = await res.json();
    expect(json).toEqual([]);
  });
});

describe('POST /api/matches', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 401 when not authorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await POST(makePostRequest({ targetClerkId: 'user-2', score: 85 }));
    expect(res.status).toBe(401);
  });

  it('creates new match', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    // existing match check -> none
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(selectChain);
    // insert match
    const insertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ user1Id: 'user-abc', user2Id: 'user-2', score: 85 }]),
    };
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue(insertChain);

    const res = await POST(makePostRequest({ targetClerkId: 'user-2', score: 85 }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.score).toBe(85);
  });

  it('returns existing match if already matched', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const existingMatch = { user1Id: 'user-abc', user2Id: 'user-2', score: 90 };
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([existingMatch]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(selectChain);

    const res = await POST(makePostRequest({ targetClerkId: 'user-2', score: 85 }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.score).toBe(90);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('match score is stored correctly', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(selectChain);
    const insertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ user1Id: 'user-abc', user2Id: 'user-2', score: 100 }]),
    };
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue(insertChain);

    const res = await POST(makePostRequest({ targetClerkId: 'user-2', score: 100 }));
    const json = await res.json();
    expect(json.score).toBe(100);
  });

  it('score calculation considers sport overlap', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const candidateWithOverlap = {
      ...fakeUser,
      id: 2,
      authEmail: 'user-overlap',
      sportTypes: ['cycling', 'swimming'], // 'cycling' overlaps with fakeUser
    };
    const candidateNoOverlap = {
      ...fakeUser,
      id: 3,
      authEmail: 'user-nolap',
      sportTypes: ['swimming', 'tennis'], // no overlap with fakeUser
    };

    // Current user query
    const userChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([fakeUser]),
    };
    // All candidates query
    const candidatesChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([candidateWithOverlap, candidateNoOverlap]),
    };

    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(userChain)
      .mockReturnValueOnce(candidatesChain);

    // rankMatches is called with the candidates; let it call through to verify sport overlap matters
    // We mock it to return higher score for the overlapping candidate
    (rankMatches as ReturnType<typeof vi.fn>).mockReturnValue([
      { user: { ...candidateWithOverlap, id: '2', trainingSplits: [], goals: [] }, score: 70, breakdown: { sportMatch: 20 }, distanceKm: 3 },
      { user: { ...candidateNoOverlap, id: '3', trainingSplits: [], goals: [] }, score: 30, breakdown: { sportMatch: 0 }, distanceKm: 5 },
    ]);

    const res = await GET(makeGetRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.length).toBe(2);
    // The candidate with sport overlap ranks first with higher score
    expect(json[0].score).toBe(70);
    expect(json[0].breakdown.sportMatch).toBe(20);
    // The candidate without overlap has 0 sportMatch
    expect(json[1].score).toBe(30);
    expect(json[1].breakdown.sportMatch).toBe(0);
  });
});
