import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  trainingPlans: {
    id: 'id',
    creatorId: 'creator_id',
    title: 'title',
    sportType: 'sport_type',
    difficulty: 'difficulty',
    durationWeeks: 'duration_weeks',
    isPublic: 'is_public',
    createdAt: 'created_at',
  },
  trainingPlanWeeks: {
    planId: 'plan_id',
    weekNumber: 'week_number',
  },
  users: {
    authEmail: 'clerk_id',
    username: 'username',
    avatarUrl: 'avatar_url',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ _eq: val })),
  and: vi.fn((...conds: unknown[]) => ({ _and: conds })),
  desc: vi.fn((col: unknown) => ({ _desc: col })),
  asc: vi.fn((col: unknown) => ({ _asc: col })),
  inArray: vi.fn((_col: unknown, vals: unknown) => ({ _inArray: vals })),
}));

import { GET, POST } from '@/app/api/plans/route';
import { GET as GetPlan, DELETE as DeletePlan } from '@/app/api/plans/[id]/route';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';

function makeGetRequest(params: Record<string, string> = {}): Request {
  const url = new URL('http://localhost:3000/api/plans');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url.toString(), { method: 'GET' });
}

function makePostRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/plans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const makeParams = (id: string) => Promise.resolve({ id });

const fakePlan = {
  id: 1,
  creatorId: 'user-abc',
  title: 'Plan na maraton',
  description: 'Plan treningowy 16 tygodni',
  sportType: 'running',
  difficulty: 'intermediate',
  durationWeeks: 16,
  isPublic: true,
  createdAt: new Date().toISOString(),
};

describe('GET /api/plans', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 401 when not authorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it('returns public plans list', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const plansChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([fakePlan]),
    };
    const creatorsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ authEmail: 'user-abc', username: 'wojtek', avatarUrl: null }]),
    };
    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(plansChain)
      .mockReturnValueOnce(creatorsChain);

    const res = await GET(makeGetRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json[0].title).toBe('Plan na maraton');
    expect(json[0].creator.username).toBe('wojtek');
  });

  it('returns empty array when no plans', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const plansChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(plansChain);

    const res = await GET(makeGetRequest());
    const json = await res.json();
    expect(json).toEqual([]);
  });
});

describe('POST /api/plans', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 401 when not authorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await POST(makePostRequest({ title: 'Plan', sportType: 'running', difficulty: 'easy', durationWeeks: 8 }));
    expect(res.status).toBe(401);
  });

  it('creates plan with valid data', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const insertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([fakePlan]),
    };
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue(insertChain);

    const res = await POST(makePostRequest({
      title: 'Plan na maraton',
      sportType: 'running',
      difficulty: 'intermediate',
      durationWeeks: 16,
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.title).toBe('Plan na maraton');
  });

  it('returns 400 when title is too short', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const res = await POST(makePostRequest({ title: 'X', sportType: 'running', difficulty: 'easy', durationWeeks: 8 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when sportType is missing', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const res = await POST(makePostRequest({ title: 'Good title', sportType: '', difficulty: 'easy', durationWeeks: 8 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when difficulty is missing', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const res = await POST(makePostRequest({ title: 'Good title', sportType: 'running', difficulty: '', durationWeeks: 8 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when durationWeeks is out of range', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const res = await POST(makePostRequest({ title: 'Good title', sportType: 'running', difficulty: 'easy', durationWeeks: 53 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when durationWeeks < 1', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const res = await POST(makePostRequest({ title: 'Good title', sportType: 'running', difficulty: 'easy', durationWeeks: 0 }));
    expect(res.status).toBe(400);
  });
});

describe('GET /api/plans/[id]', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 401 when not authorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const req = new Request('http://localhost:3000/api/plans/1');
    const res = await GetPlan(req, { params: makeParams('1') });
    expect(res.status).toBe(401);
  });

  it('returns plan with weeks and creator', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const planChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([fakePlan]),
    };
    const weeksChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([{ weekNumber: 1 }, { weekNumber: 2 }]),
    };
    const creatorChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ username: 'wojtek', avatarUrl: null, authEmail: 'user-abc' }]),
    };
    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(planChain)
      .mockReturnValueOnce(weeksChain)
      .mockReturnValueOnce(creatorChain);

    const req = new Request('http://localhost:3000/api/plans/1');
    const res = await GetPlan(req, { params: makeParams('1') });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.weeks).toHaveLength(2);
    expect(json.creator.username).toBe('wojtek');
  });

  it('returns 404 when plan not found', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const planChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(planChain);

    const req = new Request('http://localhost:3000/api/plans/999');
    const res = await GetPlan(req, { params: makeParams('999') });
    expect(res.status).toBe(404);
  });

  it('returns 403 when accessing private plan of another user', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-other');
    const planChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ ...fakePlan, isPublic: false }]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(planChain);

    const req = new Request('http://localhost:3000/api/plans/1');
    const res = await GetPlan(req, { params: makeParams('1') });
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/plans/[id]', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 401 when not authorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const req = new Request('http://localhost:3000/api/plans/1', { method: 'DELETE' });
    const res = await DeletePlan(req, { params: makeParams('1') });
    expect(res.status).toBe(401);
  });

  it('deletes plan and weeks (cascade)', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const planChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 1 }]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(planChain);
    const deleteChain = {
      where: vi.fn().mockResolvedValue(undefined),
    };
    (db.delete as ReturnType<typeof vi.fn>).mockReturnValue(deleteChain);

    const req = new Request('http://localhost:3000/api/plans/1', { method: 'DELETE' });
    const res = await DeletePlan(req, { params: makeParams('1') });
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(db.delete).toHaveBeenCalledTimes(2);
  });

  it('returns 404 when not owner (plan not found for user)', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-other');
    const planChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(planChain);

    const req = new Request('http://localhost:3000/api/plans/1', { method: 'DELETE' });
    const res = await DeletePlan(req, { params: makeParams('1') });
    expect(res.status).toBe(404);
  });
});
