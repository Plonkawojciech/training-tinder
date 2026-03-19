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
    authEmail: 'clerk_id',
    username: 'username',
    avatarUrl: 'avatar_url',
    sportTypes: 'sport_types',
    weeklyKm: 'weekly_km',
    city: 'city',
  },
  sessionParticipants: {
    userId: 'user_id',
    sessionId: 'session_id',
  },
}));

vi.mock('drizzle-orm', () => ({
  desc: vi.fn((col: unknown) => ({ _desc: col })),
  sql: Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => ({ _sql: strings.join('?'), values }),
    {}
  ),
  inArray: vi.fn((_col: unknown, vals: unknown) => ({ _inArray: vals })),
}));

import { GET } from '@/app/api/leaderboard/route';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';

const mockReq = new Request('http://localhost/api/leaderboard');

const fakeUsers = [
  {
    id: 'user-a@example.com',
    username: 'runner_a',
    avatarUrl: 'https://img/a.jpg',
    sportTypes: ['running'],
    weeklyKm: 80,
    city: 'Kraków',
  },
  {
    id: 'user-b@example.com',
    username: 'runner_b',
    avatarUrl: null,
    sportTypes: ['cycling', 'running'],
    weeklyKm: 50,
    city: 'Warszawa',
  },
  {
    id: 'user-c@example.com',
    username: 'runner_c',
    avatarUrl: null,
    sportTypes: ['swimming'],
    weeklyKm: 30,
    city: 'Gdańsk',
  },
];

// Helper: mock two sequential db.select() calls (users query + session counts query)
function mockLeaderboardQueries(topUsers: typeof fakeUsers, sessionCountRows: { userId: string; count: number }[]) {
  // First query: users (select → from → where → orderBy → limit)
  const usersChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(topUsers),
  };
  // Second query: sessionParticipants (select → from → where → groupBy)
  const sessionChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockResolvedValue(sessionCountRows),
  };
  (db.select as ReturnType<typeof vi.fn>)
    .mockReturnValueOnce(usersChain)
    .mockReturnValueOnce(sessionChain);
}

// --- Tests ---

describe('GET /api/leaderboard', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 401 when not authorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await GET(mockReq);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns leaderboard sorted by weeklyKm with ranks', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-a@example.com');
    mockLeaderboardQueries(fakeUsers, [
      { userId: 'user-a@example.com', count: 10 },
      { userId: 'user-b@example.com', count: 5 },
    ]);

    const res = await GET(mockReq);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(json)).toBe(true);
    expect(json).toHaveLength(3);
    // Ranks assigned in order
    expect(json[0].rank).toBe(1);
    expect(json[1].rank).toBe(2);
    expect(json[2].rank).toBe(3);
    // First user has highest weeklyKm
    expect(json[0].weeklyKm).toBe(80);
    expect(json[0].username).toBe('runner_a');
  });

  it('includes session counts from sessionParticipants', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-a@example.com');
    mockLeaderboardQueries(fakeUsers, [
      { userId: 'user-a@example.com', count: 10 },
      { userId: 'user-b@example.com', count: 5 },
    ]);

    const res = await GET(mockReq);
    const json = await res.json();

    expect(json[0].sessionCount).toBe(10);
    expect(json[1].sessionCount).toBe(5);
    // user-c has no sessions
    expect(json[2].sessionCount).toBe(0);
  });

  it('marks current user with isCurrentUser flag', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-b@example.com');
    mockLeaderboardQueries(fakeUsers, []);

    const res = await GET(mockReq);
    const json = await res.json();

    expect(json[0].isCurrentUser).toBe(false); // user-a
    expect(json[1].isCurrentUser).toBe(true);  // user-b = current
    expect(json[2].isCurrentUser).toBe(false); // user-c
  });

  it('returns empty array when no users have profiles', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-a@example.com');
    // First query returns no users
    const usersChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce(usersChain);
    // No second query because userIds.length === 0

    const res = await GET(mockReq);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual([]);
  });

  it('defaults weeklyKm to 0 when null', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-a@example.com');
    const userWithNullKm = [{ ...fakeUsers[0], weeklyKm: null }];
    mockLeaderboardQueries(userWithNullKm, []);

    const res = await GET(mockReq);
    const json = await res.json();

    expect(json[0].weeklyKm).toBe(0);
  });

  it('includes user fields: username, avatarUrl, sportTypes, city', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-a@example.com');
    mockLeaderboardQueries([fakeUsers[0]], []);

    const res = await GET(mockReq);
    const json = await res.json();

    expect(json[0].username).toBe('runner_a');
    expect(json[0].avatarUrl).toBe('https://img/a.jpg');
    expect(json[0].sportTypes).toEqual(['running']);
    expect(json[0].city).toBe('Kraków');
    expect(json[0].id).toBe('user-a@example.com');
  });
});
