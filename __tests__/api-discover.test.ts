import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---

vi.mock('@/lib/server-auth', () => ({
  getAuthUserId: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock('@/lib/db/schema', () => ({
  users: {
    authEmail: 'auth_email',
    lat: 'lat',
    lon: 'lon',
  },
  swipes: {
    targetId: 'target_id',
    swiperId: 'swiper_id',
  },
}));

vi.mock('drizzle-orm', () => {
  // sql must behave as a tagged template literal AND have a .join() method
  const sqlFn = Object.assign(
    (..._args: unknown[]) => ({ _sql: true }),
    { join: (..._args: unknown[]) => ({ _sqlJoin: true }) }
  );
  return {
    eq: vi.fn((_col: unknown, val: unknown) => ({ _eq: val })),
    sql: sqlFn,
  };
});

vi.mock('@/lib/matching', () => ({
  rankMatches: vi.fn(),
  filterByLocation: vi.fn(),
  filterBySport: vi.fn(),
}));

import { GET } from '@/app/api/discover/route';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { rankMatches, filterByLocation, filterBySport } from '@/lib/matching';
import type { MatchResult, UserForMatching } from '@/lib/matching';

// --- Test data ---

const currentDbUser = {
  id: 1,
  authEmail: 'user-me',
  username: 'wojtek',
  avatarUrl: null,
  bio: 'Running and cycling',
  sportTypes: ['running', 'cycling'],
  pacePerKm: 300,
  weeklyKm: 50,
  city: 'Warszawa',
  lat: 52.23,
  lon: 21.01,
  stravaVerified: true,
  athleteLevel: 'competitive',
  gymName: null,
  strengthLevel: null,
  trainingSplits: [],
  goals: ['marathon'],
  availability: ['morning'],
  profileSongUrl: null,
  ftpWatts: 250,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const candidateDbUser = {
  id: 2,
  authEmail: 'user-other',
  username: 'adam',
  avatarUrl: null,
  bio: 'I run fast',
  sportTypes: ['running'],
  pacePerKm: 290,
  weeklyKm: 60,
  city: 'Warszawa',
  lat: 52.24,
  lon: 21.02,
  stravaVerified: false,
  athleteLevel: 'competitive',
  gymName: null,
  strengthLevel: null,
  trainingSplits: [],
  goals: ['half-marathon'],
  availability: ['morning'],
  profileSongUrl: null,
  ftpWatts: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const verifiedCandidateDbUser = {
  ...candidateDbUser,
  id: 3,
  authEmail: 'user-verified',
  username: 'kasia',
  stravaVerified: true,
  ftpWatts: 200,
  profileSongUrl: 'https://example.com/song.mp3',
};

function makeMatchResult(user: UserForMatching, score: number): MatchResult {
  return {
    user,
    score,
    breakdown: {
      sportMatch: 20,
      paceMatch: 30,
      locationMatch: 20,
      weeklyKmMatch: 10,
      gymMatch: 0,
      splitMatch: 0,
      strengthMatch: 0,
      goalMatch: 0,
      profileCompletion: 10,
    },
    distanceKm: 1.5,
  };
}

function toUserForMatching(u: typeof candidateDbUser): UserForMatching {
  return {
    id: String(u.id),
    authEmail: u.authEmail,
    username: u.username,
    avatarUrl: u.avatarUrl,
    bio: u.bio,
    sportTypes: u.sportTypes,
    pacePerKm: u.pacePerKm,
    weeklyKm: u.weeklyKm,
    city: u.city,
    lat: u.lat,
    lon: u.lon,
    gymName: u.gymName,
    strengthLevel: u.strengthLevel,
    trainingSplits: u.trainingSplits,
    goals: u.goals,
    availability: u.availability,
  };
}

/**
 * Mock db.select() chain for:
 *   1. Current user query (select -> from -> where -> limit)
 *   2. Swiped users query (select -> from -> where -> resolves to [])
 *   3. All candidate users query (select -> from -> where -> limit)
 */
function mockDbForDiscover(
  currentUser: typeof currentDbUser | null,
  candidates: (typeof candidateDbUser)[]
) {
  // Each chain method must return the chain object, not `this` (which would be the fn itself)
  const currentUserChain: Record<string, ReturnType<typeof vi.fn>> = {};
  currentUserChain.from = vi.fn().mockReturnValue(currentUserChain);
  currentUserChain.where = vi.fn().mockReturnValue(currentUserChain);
  currentUserChain.limit = vi.fn().mockResolvedValue(currentUser ? [currentUser] : []);

  const swipesChain: Record<string, ReturnType<typeof vi.fn>> = {};
  swipesChain.from = vi.fn().mockReturnValue(swipesChain);
  swipesChain.where = vi.fn().mockResolvedValue([]); // no prior swipes

  const allUsersChain: Record<string, ReturnType<typeof vi.fn>> = {};
  allUsersChain.from = vi.fn().mockReturnValue(allUsersChain);
  allUsersChain.where = vi.fn().mockReturnValue(allUsersChain);
  allUsersChain.limit = vi.fn().mockReturnValue(allUsersChain);
  allUsersChain.offset = vi.fn().mockResolvedValue(candidates);

  (db.select as ReturnType<typeof vi.fn>)
    .mockReturnValueOnce(currentUserChain)   // 1. current user
    .mockReturnValueOnce(swipesChain)        // 2. swiped users
    .mockReturnValueOnce(allUsersChain);     // 3. candidates
}

function makeRequest(params: Record<string, string> = {}): Request {
  const url = new URL('http://localhost:3000/api/discover');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url.toString(), { method: 'GET' });
}

// --- Tests ---

describe('GET /api/discover', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns 401 when not authorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns empty array when current user not found in DB', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-me');
    mockDbForDiscover(null, []);

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual([]);
  });

  it('returns ranked athletes on success', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-me');
    mockDbForDiscover(currentDbUser, [candidateDbUser]);

    const candidateMatch = toUserForMatching(candidateDbUser);
    const matchResult = makeMatchResult(candidateMatch, 75);

    (rankMatches as ReturnType<typeof vi.fn>).mockReturnValue([matchResult]);
    (filterByLocation as ReturnType<typeof vi.fn>).mockReturnValue([matchResult]);

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBe(1);
    expect(json[0].user.username).toBe('adam');
    expect(json[0].score).toBe(75); // not verified, no bonus
  });

  it('adds +10 score bonus for strava-verified athletes (capped at 100)', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-me');
    mockDbForDiscover(currentDbUser, [verifiedCandidateDbUser]);

    const verifiedMatch = toUserForMatching(verifiedCandidateDbUser);
    const matchResult = makeMatchResult(verifiedMatch, 80);

    (rankMatches as ReturnType<typeof vi.fn>).mockReturnValue([matchResult]);
    (filterByLocation as ReturnType<typeof vi.fn>).mockReturnValue([matchResult]);

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json[0].score).toBe(90); // 80 + 10 verified bonus
    expect(json[0].user.stravaVerified).toBe(true);
    expect(json[0].user.profileSongUrl).toBe('https://example.com/song.mp3');
    expect(json[0].user.ftpWatts).toBe(200);
  });

  it('caps verified bonus at 100', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-me');
    mockDbForDiscover(currentDbUser, [verifiedCandidateDbUser]);

    const verifiedMatch = toUserForMatching(verifiedCandidateDbUser);
    const matchResult = makeMatchResult(verifiedMatch, 95);

    (rankMatches as ReturnType<typeof vi.fn>).mockReturnValue([matchResult]);
    (filterByLocation as ReturnType<typeof vi.fn>).mockReturnValue([matchResult]);

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json[0].score).toBe(100); // min(100, 95+10) = 100
  });

  it('passes sport filter to filterBySport', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-me');
    mockDbForDiscover(currentDbUser, [candidateDbUser]);

    (rankMatches as ReturnType<typeof vi.fn>).mockReturnValue([]);
    (filterByLocation as ReturnType<typeof vi.fn>).mockReturnValue([]);
    (filterBySport as ReturnType<typeof vi.fn>).mockReturnValue([]);

    await GET(makeRequest({ sport: 'cycling' }));

    expect(filterBySport).toHaveBeenCalledWith([], 'cycling');
  });

  it('does not call filterBySport when sport=all (default)', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-me');
    mockDbForDiscover(currentDbUser, []);

    (rankMatches as ReturnType<typeof vi.fn>).mockReturnValue([]);
    (filterByLocation as ReturnType<typeof vi.fn>).mockReturnValue([]);

    await GET(makeRequest()); // no sport param -> defaults to 'all'

    // filterBySport should NOT be called because sport === 'all'
    expect(filterBySport).not.toHaveBeenCalled();
  });

  it('passes radius to filterByLocation (default 100)', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-me');
    mockDbForDiscover(currentDbUser, []);

    (rankMatches as ReturnType<typeof vi.fn>).mockReturnValue([]);
    (filterByLocation as ReturnType<typeof vi.fn>).mockReturnValue([]);

    await GET(makeRequest());

    expect(filterByLocation).toHaveBeenCalledWith([], 100);
  });

  it('uses custom radius from query parameter', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-me');
    mockDbForDiscover(currentDbUser, []);

    (rankMatches as ReturnType<typeof vi.fn>).mockReturnValue([]);
    (filterByLocation as ReturnType<typeof vi.fn>).mockReturnValue([]);

    await GET(makeRequest({ radius: '25' }));

    expect(filterByLocation).toHaveBeenCalledWith([], 25);
  });

  it('falls back to 100 when radius is 0 (falsy), Math.max ensures minimum 1 for negative', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-me');
    mockDbForDiscover(currentDbUser, []);

    (rankMatches as ReturnType<typeof vi.fn>).mockReturnValue([]);
    (filterByLocation as ReturnType<typeof vi.fn>).mockReturnValue([]);

    // radius=0 -> parseInt('0')=0 -> 0||100=100 -> Math.max(1,100)=100
    await GET(makeRequest({ radius: '0' }));
    expect(filterByLocation).toHaveBeenCalledWith([], 100);
  });

  it('clamps negative radius to minimum of 1', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-me');
    mockDbForDiscover(currentDbUser, []);

    (rankMatches as ReturnType<typeof vi.fn>).mockReturnValue([]);
    (filterByLocation as ReturnType<typeof vi.fn>).mockReturnValue([]);

    // radius=-5 -> parseInt('-5')=-5 -> -5||-5 is -5 (truthy) -> Math.max(1,-5)=1
    await GET(makeRequest({ radius: '-5' }));
    expect(filterByLocation).toHaveBeenCalledWith([], 1);
  });

  it('filters by verified flag (advanced filter)', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-me');

    const unverified = { ...candidateDbUser, stravaVerified: false };
    const verified = { ...verifiedCandidateDbUser };
    mockDbForDiscover(currentDbUser, [unverified, verified]);

    const verifiedUserForMatch = toUserForMatching(verified);
    const matchResult = makeMatchResult(verifiedUserForMatch, 70);

    (rankMatches as ReturnType<typeof vi.fn>).mockReturnValue([matchResult]);
    (filterByLocation as ReturnType<typeof vi.fn>).mockReturnValue([matchResult]);
    (filterBySport as ReturnType<typeof vi.fn>).mockReturnValue([matchResult]);

    const res = await GET(makeRequest({ verified: 'true', sport: 'running' }));
    await res.json();

    expect(res.status).toBe(200);
    // rankMatches should be called with only verified candidates
    const rankedCandidates = (rankMatches as ReturnType<typeof vi.fn>).mock.calls[0][1] as UserForMatching[];
    expect(rankedCandidates.length).toBe(1);
    expect(rankedCandidates[0].authEmail).toBe('user-verified');
  });

  it('filters by level (advanced filter)', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-me');

    const beginner = { ...candidateDbUser, authEmail: 'user-beginner', athleteLevel: 'beginner' };
    const competitive = { ...candidateDbUser, authEmail: 'user-comp', athleteLevel: 'competitive' };
    mockDbForDiscover(currentDbUser, [beginner, competitive]);

    (rankMatches as ReturnType<typeof vi.fn>).mockReturnValue([]);
    (filterByLocation as ReturnType<typeof vi.fn>).mockReturnValue([]);

    await GET(makeRequest({ level: 'competitive' }));

    const rankedCandidates = (rankMatches as ReturnType<typeof vi.fn>).mock.calls[0][1] as UserForMatching[];
    expect(rankedCandidates.length).toBe(1);
    expect(rankedCandidates[0].authEmail).toBe('user-comp');
  });

  it('filters by pace range (advanced filter)', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-me');

    const slow = { ...candidateDbUser, authEmail: 'user-slow', pacePerKm: 400 };
    const fast = { ...candidateDbUser, authEmail: 'user-fast', pacePerKm: 250 };
    const mid = { ...candidateDbUser, authEmail: 'user-mid', pacePerKm: 300 };
    mockDbForDiscover(currentDbUser, [slow, fast, mid]);

    (rankMatches as ReturnType<typeof vi.fn>).mockReturnValue([]);
    (filterByLocation as ReturnType<typeof vi.fn>).mockReturnValue([]);

    await GET(makeRequest({ minPace: '270', maxPace: '350' }));

    const rankedCandidates = (rankMatches as ReturnType<typeof vi.fn>).mock.calls[0][1] as UserForMatching[];
    expect(rankedCandidates.length).toBe(1);
    expect(rankedCandidates[0].authEmail).toBe('user-mid');
  });

  it('filters by weeklyKm range (advanced filter)', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-me');

    const low = { ...candidateDbUser, authEmail: 'user-low', weeklyKm: 10 };
    const high = { ...candidateDbUser, authEmail: 'user-high', weeklyKm: 100 };
    const mid = { ...candidateDbUser, authEmail: 'user-mid', weeklyKm: 40 };
    mockDbForDiscover(currentDbUser, [low, high, mid]);

    (rankMatches as ReturnType<typeof vi.fn>).mockReturnValue([]);
    (filterByLocation as ReturnType<typeof vi.fn>).mockReturnValue([]);

    await GET(makeRequest({ minWeeklyKm: '30', maxWeeklyKm: '60' }));

    const rankedCandidates = (rankMatches as ReturnType<typeof vi.fn>).mock.calls[0][1] as UserForMatching[];
    expect(rankedCandidates.length).toBe(1);
    expect(rankedCandidates[0].authEmail).toBe('user-mid');
  });

  it('excludes candidates with null pacePerKm when minPace is set', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-me');

    const noPace = { ...candidateDbUser, authEmail: 'user-nopace', pacePerKm: null };
    mockDbForDiscover(currentDbUser, [noPace]);

    (rankMatches as ReturnType<typeof vi.fn>).mockReturnValue([]);
    (filterByLocation as ReturnType<typeof vi.fn>).mockReturnValue([]);

    await GET(makeRequest({ minPace: '200' }));

    const rankedCandidates = (rankMatches as ReturnType<typeof vi.fn>).mock.calls[0][1] as UserForMatching[];
    expect(rankedCandidates.length).toBe(0);
  });

  it('pagination: respects offset parameter', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-me');
    mockDbForDiscover(currentDbUser, [candidateDbUser]);

    const candidateMatch = toUserForMatching(candidateDbUser);
    const matchResult = makeMatchResult(candidateMatch, 70);

    (rankMatches as ReturnType<typeof vi.fn>).mockReturnValue([matchResult]);
    (filterByLocation as ReturnType<typeof vi.fn>).mockReturnValue([matchResult]);

    await GET(makeRequest({ offset: '10' }));

    // The third db.select() call is the candidates query; verify offset was called with 10
    const thirdSelectCall = (db.select as ReturnType<typeof vi.fn>).mock.results[2].value;
    expect(thirdSelectCall.offset).toHaveBeenCalledWith(10);
  });

  it('empty result: returns empty array when no candidates after filtering', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-me');
    mockDbForDiscover(currentDbUser, [candidateDbUser]);

    const candidateMatch = toUserForMatching(candidateDbUser);
    const matchResult = makeMatchResult(candidateMatch, 50);

    // rankMatches returns results but filterByLocation filters them all out
    (rankMatches as ReturnType<typeof vi.fn>).mockReturnValue([matchResult]);
    (filterByLocation as ReturnType<typeof vi.fn>).mockReturnValue([]);

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual([]);
  });
});
