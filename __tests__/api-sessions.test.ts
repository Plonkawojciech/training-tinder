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
  sessions: {
    id: 'id',
    creatorId: 'creator_id',
    sportType: 'sport_type',
    lat: 'lat',
    lon: 'lon',
    createdAt: 'created_at',
    privacy: 'privacy',
  },
  sessionParticipants: {
    id: 'id',
    sessionId: 'session_id',
    userId: 'user_id',
  },
  sessionMessages: {
    sessionId: 'session_id',
  },
  sessionReviews: {
    sessionId: 'session_id',
  },
  users: {
    authEmail: 'clerk_id',
    username: 'username',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ _eq: val })),
  desc: vi.fn((col: unknown) => ({ _desc: col })),
  inArray: vi.fn((_col: unknown, vals: unknown) => ({ _inArray: vals })),
  and: vi.fn((...conds: unknown[]) => ({ _and: conds })),
  gte: vi.fn((_col: unknown, val: unknown) => ({ _gte: val })),
  lte: vi.fn((_col: unknown, val: unknown) => ({ _lte: val })),
}));

import { GET, POST } from '@/app/api/sessions/route';
import { PUT, DELETE } from '@/app/api/sessions/[id]/route';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';

// Helpers
function makeGetRequest(params: Record<string, string> = {}): Request {
  const url = new URL('http://localhost:3000/api/sessions');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url.toString(), { method: 'GET' });
}

function makePostRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validSessionBody = {
  title: 'Poranny bieg',
  sportType: 'running',
  date: '2026-04-01',
  time: '07:00',
  location: 'Park Łazienkowski',
  maxParticipants: 5,
};

const fakeSession = {
  id: 1,
  creatorId: 'user-abc',
  title: 'Poranny bieg',
  sportType: 'running',
  date: '2026-04-01',
  time: '07:00',
  location: 'Park Łazienkowski',
  lat: null,
  lon: null,
  maxParticipants: 5,
  gpxUrl: null,
  description: null,
  status: 'open',
  privacy: 'public',
  createdAt: new Date(),
};

// --- GET tests ---

describe('GET /api/sessions', () => {
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

  it('returns sessions array on success', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    // db.select() chain for sessions query
    const sessionsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([fakeSession]),
    };

    // db.select() chain for participants and creators batch queries
    const participantsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ sessionId: 1 }]),
    };
    const creatorsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ authEmail: 'user-abc', username: 'wojtek' }]),
    };

    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(sessionsChain)       // sessions query
      .mockReturnValueOnce(participantsChain)    // participants count
      .mockReturnValueOnce(creatorsChain);       // creator names

    const res = await GET(makeGetRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBe(1);
    expect(json[0].title).toBe('Poranny bieg');
    expect(json[0].participantCount).toBe(1);
    expect(json[0].creatorName).toBe('wojtek');
  });

  it('returns empty array when no sessions exist', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const sessionsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(sessionsChain);

    const res = await GET(makeGetRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual([]);
  });
});

// --- POST tests ---

describe('POST /api/sessions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns 401 when not authorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await POST(makePostRequest(validSessionBody));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('creates session with valid data', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    // db.insert(sessions).values().returning()
    const insertSessionChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([fakeSession]),
    };
    // db.insert(sessionParticipants).values()
    const insertParticipantChain = {
      values: vi.fn().mockResolvedValue(undefined),
    };

    (db.insert as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(insertSessionChain)
      .mockReturnValueOnce(insertParticipantChain);

    const res = await POST(makePostRequest(validSessionBody));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.title).toBe('Poranny bieg');
    expect(json.sportType).toBe('running');
    // Verify auto-join as host
    expect(db.insert).toHaveBeenCalledTimes(2);
  });

  it('returns 400 when title is missing', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const body = { ...validSessionBody, title: undefined };
    const res = await POST(makePostRequest(body));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('TITLE_TOO_SHORT');
  });

  it('returns 400 when title is too short', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const body = { ...validSessionBody, title: 'A' };
    const res = await POST(makePostRequest(body));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('TITLE_TOO_SHORT');
  });

  it('returns 400 when title exceeds 120 characters', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const body = { ...validSessionBody, title: 'A'.repeat(121) };
    const res = await POST(makePostRequest(body));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('INVALID_INPUT');
  });

  it('returns 400 when date format is invalid', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const body = { ...validSessionBody, date: '01-04-2026' };
    const res = await POST(makePostRequest(body));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('INVALID_DATE');
  });

  it('returns 400 when date is not a string', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const body = { ...validSessionBody, date: 20260401 };
    const res = await POST(makePostRequest(body));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('INVALID_DATE');
  });

  it('returns 400 when time format is invalid', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const body = { ...validSessionBody, time: '7am' };
    const res = await POST(makePostRequest(body));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('INVALID_TIME');
  });

  it('returns 400 when sportType is missing', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const body = { ...validSessionBody, sportType: '' };
    const res = await POST(makePostRequest(body));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('MISSING_FIELDS');
  });

  it('returns 400 when location is missing', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const body = { ...validSessionBody, location: '' };
    const res = await POST(makePostRequest(body));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('MISSING_FIELDS');
  });

  it('returns 400 when maxParticipants is below 2', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const body = { ...validSessionBody, maxParticipants: 1 };
    const res = await POST(makePostRequest(body));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('INVALID_INPUT');
  });

  it('returns 400 when maxParticipants exceeds 200', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const body = { ...validSessionBody, maxParticipants: 201 };
    const res = await POST(makePostRequest(body));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('INVALID_INPUT');
  });

  it('accepts maxParticipants at boundary values (2 and 200)', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    for (const max of [2, 200]) {
      const insertSessionChain = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ ...fakeSession, maxParticipants: max }]),
      };
      const insertParticipantChain = {
        values: vi.fn().mockResolvedValue(undefined),
      };
      (db.insert as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(insertSessionChain)
        .mockReturnValueOnce(insertParticipantChain);

      const body = { ...validSessionBody, maxParticipants: max };
      const res = await POST(makePostRequest(body));

      expect(res.status).toBe(200);
    }
  });

  it('returns 400 for invalid latitude', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const body = { ...validSessionBody, lat: 91 };
    const res = await POST(makePostRequest(body));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('INVALID_COORDINATES');
  });

  it('returns 400 for invalid longitude', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const body = { ...validSessionBody, lon: 181 };
    const res = await POST(makePostRequest(body));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('INVALID_COORDINATES');
  });

  it('defaults maxParticipants to 10 when not provided', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const insertSessionChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ ...fakeSession, maxParticipants: 10 }]),
    };
    const insertParticipantChain = {
      values: vi.fn().mockResolvedValue(undefined),
    };
    (db.insert as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(insertSessionChain)
      .mockReturnValueOnce(insertParticipantChain);

    const { maxParticipants: _, ...bodyWithoutMax } = validSessionBody;
    const res = await POST(makePostRequest(bodyWithoutMax));

    expect(res.status).toBe(200);
    // values() should have been called with maxParticipants: 10
    expect(insertSessionChain.values).toHaveBeenCalledWith(
      expect.objectContaining({ maxParticipants: 10 })
    );
  });
});

// --- PUT / DELETE [id] tests ---

function makePutRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/sessions/1', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(): Request {
  return new Request('http://localhost:3000/api/sessions/1', {
    method: 'DELETE',
  });
}

const fakeParams = Promise.resolve({ id: '1' });

describe('PUT /api/sessions/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns 403 when non-owner tries to update', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-other');

    // db.select() chain to find existing session (owned by user-abc)
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([fakeSession]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(selectChain);

    const res = await PUT(makePutRequest({ title: 'Hacked' }), { params: fakeParams });
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error.code).toBe('FORBIDDEN');
  });
});

describe('DELETE /api/sessions/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns 403 when non-owner tries to delete', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-other');

    // db.select() chain to find existing session (owned by user-abc)
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([fakeSession]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(selectChain);

    const res = await DELETE(makeDeleteRequest(), { params: fakeParams });
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error.code).toBe('FORBIDDEN');
  });
});

describe('GET /api/sessions (sport filter)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('filters by sport type parameter', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const cyclingSession = { ...fakeSession, id: 2, sportType: 'cycling' };

    // db.select() chain for sessions query — returns both running and cycling
    const sessionsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([fakeSession, cyclingSession]),
    };

    // db.select() chain for participants and creators batch queries
    const participantsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ sessionId: 1 }, { sessionId: 2 }]),
    };
    const creatorsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ authEmail: 'user-abc', username: 'wojtek' }]),
    };

    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(sessionsChain)
      .mockReturnValueOnce(participantsChain)
      .mockReturnValueOnce(creatorsChain);

    const res = await GET(makeGetRequest({ sport: 'running' }));
    await res.json();

    expect(res.status).toBe(200);
    // The sport param is pushed as an eq condition into the DB WHERE clause,
    // so the route handler passes it to drizzle eq(). Verify eq was called with 'running'.
    const { eq } = await import('drizzle-orm');
    expect(eq).toHaveBeenCalledWith('sport_type', 'running');
  });
});
