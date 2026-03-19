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
  personalRecords: {
    userId: 'user_id',
    exerciseName: 'exercise_name',
    weightKg: 'weight_kg',
    reps: 'reps',
    notes: 'notes',
    achievedAt: 'achieved_at',
  },
  activityFeed: {},
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ _eq: val })),
  and: vi.fn((...conds: unknown[]) => ({ _and: conds })),
  desc: vi.fn((col: unknown) => ({ _desc: col })),
  sql: vi.fn(),
}));

import { GET, POST } from '@/app/api/records/route';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';

function makeGetRequest(params: Record<string, string> = {}): Request {
  const url = new URL('http://localhost:3000/api/records');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url.toString(), { method: 'GET' });
}

function makePostRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const fakePR = {
  id: 1,
  userId: 'user-abc',
  exerciseName: 'Bench Press',
  weightKg: 100,
  reps: 1,
  notes: null,
  achievedAt: new Date().toISOString(),
};

describe('GET /api/records', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 401 when not authorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it('returns all PRs with best per exercise', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([
        fakePR,
        { ...fakePR, id: 2, weightKg: 80 },
      ]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    const res = await GET(makeGetRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.all).toHaveLength(2);
    expect(json.best).toHaveLength(1);
    expect(json.best[0].weightKg).toBe(100);
  });

  it('filters by exercise name', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([fakePR]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    const res = await GET(makeGetRequest({ exercise: 'Bench Press' }));
    const json = await res.json();
    expect(json.all).toHaveLength(1);
  });

  it('returns empty when no PRs', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    const res = await GET(makeGetRequest());
    const json = await res.json();
    expect(json.all).toEqual([]);
    expect(json.best).toEqual([]);
  });
});

describe('POST /api/records', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 401 when not authorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await POST(makePostRequest({ exerciseName: 'Squat', weightKg: 120, reps: 1 }));
    expect(res.status).toBe(401);
  });

  it('creates new PR and adds to activity feed', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const insertPrChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([fakePR]),
    };
    const insertFeedChain = {
      values: vi.fn().mockResolvedValue(undefined),
    };
    (db.insert as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(insertPrChain)
      .mockReturnValueOnce(insertFeedChain);

    const res = await POST(makePostRequest({ exerciseName: 'Bench Press', weightKg: 100, reps: 1 }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.exerciseName).toBe('Bench Press');
    expect(db.insert).toHaveBeenCalledTimes(2);
  });

  it('creates PR with notes', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const insertPrChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ ...fakePR, notes: 'Nowy rekord!' }]),
    };
    const insertFeedChain = { values: vi.fn().mockResolvedValue(undefined) };
    (db.insert as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(insertPrChain)
      .mockReturnValueOnce(insertFeedChain);

    const res = await POST(makePostRequest({ exerciseName: 'Squat', weightKg: 150, reps: 1, notes: 'Nowy rekord!' }));
    const json = await res.json();
    expect(json.notes).toBe('Nowy rekord!');
  });

  it('best picks heavier weight per exercise', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const records = [
      { ...fakePR, exerciseName: 'Squat', weightKg: 120 },
      { ...fakePR, exerciseName: 'Squat', weightKg: 150, id: 2 },
      { ...fakePR, exerciseName: 'Squat', weightKg: 100, id: 3 },
    ];
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue(records),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    const res = await GET(makeGetRequest());
    const json = await res.json();
    expect(json.best).toHaveLength(1);
    expect(json.best[0].weightKg).toBe(150);
  });
});
