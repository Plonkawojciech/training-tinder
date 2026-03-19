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
  workoutLogs: {
    id: 'id',
    userId: 'user_id',
    date: 'date',
    type: 'type',
    name: 'name',
    durationMin: 'duration_min',
    notes: 'notes',
    isPublic: 'is_public',
    createdAt: 'created_at',
  },
  exercises: {
    id: 'id',
    workoutLogId: 'workout_log_id',
    name: 'name',
    sets: 'sets',
    repsPerSet: 'reps_per_set',
    weightKg: 'weight_kg',
    notes: 'notes',
    orderIndex: 'order_index',
  },
  users: {
    authEmail: 'clerk_id',
    username: 'username',
    avatarUrl: 'avatar_url',
  },
  activityFeed: {
    id: 'id',
    userId: 'user_id',
    type: 'type',
    dataJson: 'data_json',
    createdAt: 'created_at',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ _eq: val })),
  desc: vi.fn((col: unknown) => ({ _desc: col })),
  inArray: vi.fn((_col: unknown, vals: unknown) => ({ _inArray: vals })),
  and: vi.fn((...conds: unknown[]) => ({ _and: conds })),
}));

import { GET, POST } from '@/app/api/workouts/route';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';

// Helpers

function makeGetRequest(params: Record<string, string> = {}): Request {
  const url = new URL('http://localhost:3000/api/workouts');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url.toString(), { method: 'GET' });
}

function makePostRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/workouts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validWorkoutBody = {
  date: '2026-03-19',
  type: 'strength',
  name: 'Upper Body Push',
  durationMin: 60,
  isPublic: false,
};

const fakeWorkoutLog = {
  id: 1,
  userId: 'user-abc',
  date: '2026-03-19',
  type: 'strength',
  name: 'Upper Body Push',
  durationMin: 60,
  notes: null,
  isPublic: false,
  createdAt: new Date(),
};

// --- GET tests ---

describe('GET /api/workouts', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns 401 when not authorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await GET(makeGetRequest());
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns workouts list on success', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    // Main workouts query (public, since mine is not set)
    const workoutsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([fakeWorkoutLog]),
    };

    // Exercises batch query
    const exercisesChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        { id: 1, workoutLogId: 1, name: 'Bench Press', sets: 4, repsPerSet: [8, 8, 8, 6], weightKg: [80, 80, 80, 80], notes: null, orderIndex: 0 },
      ]),
    };

    // Creators batch query
    const creatorsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        { authEmail: 'user-abc', username: 'wojtek', avatarUrl: null },
      ]),
    };

    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(workoutsChain)      // workoutLogs query
      .mockReturnValueOnce(exercisesChain)      // exercises query
      .mockReturnValueOnce(creatorsChain);      // users query

    const res = await GET(makeGetRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBe(1);
    expect(json[0].name).toBe('Upper Body Push');
    expect(json[0].exercises).toHaveLength(1);
    expect(json[0].creator.username).toBe('wojtek');
  });

  it('returns empty array when no workouts exist', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const workoutsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };

    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(workoutsChain);

    const res = await GET(makeGetRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual([]);
  });

  it('filters by mine=true', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const workoutsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([fakeWorkoutLog]),
    };

    const exercisesChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };

    const creatorsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        { authEmail: 'user-abc', username: 'wojtek', avatarUrl: null },
      ]),
    };

    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(workoutsChain)
      .mockReturnValueOnce(exercisesChain)
      .mockReturnValueOnce(creatorsChain);

    const res = await GET(makeGetRequest({ mine: 'true' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toHaveLength(1);
    // When mine=true, eq should be called with userId
    const { eq } = await import('drizzle-orm');
    expect(eq).toHaveBeenCalledWith('user_id', 'user-abc');
  });

  it('returns 500 when db throws', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const workoutsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockRejectedValue(new Error('DB connection failed')),
    };

    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(workoutsChain);

    const res = await GET(makeGetRequest());
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.code).toBe('INTERNAL_SERVER_ERROR');
  });
});

// --- POST tests ---

describe('POST /api/workouts', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns 401 when not authorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await POST(makePostRequest(validWorkoutBody));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('validates required fields (name, type, date)', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const body = { durationMin: 30 };
    const res = await POST(makePostRequest(body));
    const json = await res.json();

    expect(res.status).toBe(400);
    // date is checked first
    expect(json.error.code).toBe('INVALID_DATE');
  });

  it('validates date format (YYYY-MM-DD required)', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const body = { ...validWorkoutBody, date: '19-03-2026' };
    const res = await POST(makePostRequest(body));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('INVALID_DATE');
  });

  it('returns 400 when type is missing', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const body = { ...validWorkoutBody, type: '' };
    const res = await POST(makePostRequest(body));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('MISSING_FIELDS');
  });

  it('creates workout with valid data', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const insertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([fakeWorkoutLog]),
    };

    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue(insertChain);

    const res = await POST(makePostRequest(validWorkoutBody));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.name).toBe('Upper Body Push');
    expect(json.type).toBe('strength');
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it('returns 500 when insert throws', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const insertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockRejectedValue(new Error('DB write failed')),
    };

    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue(insertChain);

    const res = await POST(makePostRequest(validWorkoutBody));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.code).toBe('INTERNAL_SERVER_ERROR');
  });
});
