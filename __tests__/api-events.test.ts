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
  userEvents: {
    id: 'id',
    userId: 'user_id',
    eventName: 'event_name',
    eventType: 'event_type',
    sport: 'sport',
    eventDate: 'event_date',
    location: 'location',
    distanceKm: 'distance_km',
    targetTimeSec: 'target_time_sec',
    status: 'status',
    isPublic: 'is_public',
    createdAt: 'created_at',
  },
  users: {
    authEmail: 'clerk_id',
    username: 'username',
    avatarUrl: 'avatar_url',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ _eq: val })),
  desc: vi.fn((col: unknown) => ({ _desc: col })),
  and: vi.fn((...conds: unknown[]) => ({ _and: conds })),
}));

import { GET, POST } from '@/app/api/events/route';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';

// Helpers

function makeGetRequest(params: Record<string, string> = {}): Request {
  const url = new URL('http://localhost:3000/api/events');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url.toString(), { method: 'GET' });
}

function makePostRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validEventBody = {
  eventName: 'Maraton Warszawski',
  eventType: 'marathon',
  sport: 'running',
  eventDate: '2026-09-27',
  location: 'Warszawa',
  distanceKm: 42.195,
};

const fakeEvent = {
  id: 1,
  userId: 'user-abc',
  eventName: 'Maraton Warszawski',
  eventType: 'marathon',
  sport: 'running',
  eventDate: '2026-09-27',
  location: 'Warszawa',
  distanceKm: 42.195,
  targetTimeSec: null,
  status: 'registered',
  isPublic: true,
  createdAt: new Date(),
};

// --- GET tests ---

describe('GET /api/events', () => {
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

  it('returns events list on success', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    // db.select() chain for user's own events
    const myEventsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([fakeEvent]),
    };

    // db.select() chain for public events (with leftJoin)
    const publicEventsChain = {
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        {
          event: { ...fakeEvent, id: 2, userId: 'user-xyz', eventName: 'Triathlon Gdansk' },
          username: 'jan',
          avatarUrl: null,
        },
      ]),
    };

    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(myEventsChain)
      .mockReturnValueOnce(publicEventsChain);

    const res = await GET(makeGetRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.myEvents).toHaveLength(1);
    expect(json.myEvents[0].eventName).toBe('Maraton Warszawski');
  });

  it('returns empty array when no events exist', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const myEventsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([]),
    };

    const publicEventsChain = {
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };

    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(myEventsChain)
      .mockReturnValueOnce(publicEventsChain);

    const res = await GET(makeGetRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.myEvents).toEqual([]);
    expect(json.publicEvents).toEqual([]);
  });

  it('excludes public events when public=false', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const myEventsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([fakeEvent]),
    };

    (db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce(myEventsChain);

    const res = await GET(makeGetRequest({ public: 'false' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.myEvents).toHaveLength(1);
    expect(json.publicEvents).toEqual([]);
    // Only one db.select call (no public events query)
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it('returns 500 when db throws', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const myEventsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockRejectedValue(new Error('DB connection failed')),
    };

    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(myEventsChain);

    const res = await GET(makeGetRequest());
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.code).toBe('INTERNAL_SERVER_ERROR');
  });
});

// --- POST tests ---

describe('POST /api/events', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns 401 when not authorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await POST(makePostRequest(validEventBody));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('validates required fields (eventName, eventType, sport, eventDate)', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const body = { location: 'Warszawa' };
    const res = await POST(makePostRequest(body));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('MISSING_FIELDS');
  });

  it('returns 400 when eventName is missing', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const { eventName: _, ...body } = validEventBody;
    const res = await POST(makePostRequest(body));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('MISSING_FIELDS');
  });

  it('creates event with valid data', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const insertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([fakeEvent]),
    };

    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue(insertChain);

    const res = await POST(makePostRequest(validEventBody));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.eventName).toBe('Maraton Warszawski');
    expect(json.sport).toBe('running');
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it('returns 500 when insert throws', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const insertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockRejectedValue(new Error('DB write failed')),
    };

    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue(insertChain);

    const res = await POST(makePostRequest(validEventBody));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.code).toBe('INTERNAL_SERVER_ERROR');
  });
});
