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
  },
}));

vi.mock('@/lib/db/schema', () => ({
  sessionReviews: {
    id: 'id',
    sessionId: 'session_id',
    reviewerId: 'reviewer_id',
    rating: 'rating',
    comment: 'comment',
    createdAt: 'created_at',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ _eq: val })),
  and: vi.fn((...conds: unknown[]) => ({ _and: conds })),
}));

import { GET, POST } from '@/app/api/sessions/[id]/review/route';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';

const makeParams = (id: string) => Promise.resolve({ id });

function makeGetRequest(id: string, check = false): Request {
  const url = new URL(`http://localhost:3000/api/sessions/${id}/review`);
  if (check) url.searchParams.set('check', 'true');
  return new Request(url.toString(), { method: 'GET' });
}

function makePostRequest(id: string, body: unknown): Request {
  return new Request(`http://localhost:3000/api/sessions/${id}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const fakeReview = {
  id: 1,
  sessionId: 42,
  reviewerId: 'user-abc',
  rating: 4,
  comment: 'Great session!',
  createdAt: new Date(),
};

// --- GET tests ---

describe('GET /api/sessions/[id]/review', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 401 when not authorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await GET(makeGetRequest('42'), { params: makeParams('42') });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns reviews list for a session', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([fakeReview]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(selectChain);

    const res = await GET(makeGetRequest('42'), { params: makeParams('42') });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.reviews).toHaveLength(1);
    expect(json.reviews[0].rating).toBe(4);
  });

  it('returns empty reviews array when none exist', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(selectChain);

    const res = await GET(makeGetRequest('42'), { params: makeParams('42') });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.reviews).toEqual([]);
  });

  it('returns 400 for invalid session id (NaN)', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const res = await GET(makeGetRequest('abc'), { params: makeParams('abc') });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('INVALID_INPUT');
  });

  it('returns 500 on DB error in GET', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockRejectedValue(new Error('DB error')),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(selectChain);

    const res = await GET(makeGetRequest('42'), { params: makeParams('42') });
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('check=true returns hasReviewed boolean', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([fakeReview]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(selectChain);

    const res = await GET(makeGetRequest('42', true), { params: makeParams('42') });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.hasReviewed).toBe(true);
  });

  it('check=true returns false when no review exists', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(selectChain);

    const res = await GET(makeGetRequest('42', true), { params: makeParams('42') });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.hasReviewed).toBe(false);
  });
});

// --- POST tests ---

describe('POST /api/sessions/[id]/review', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 401 when not authorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await POST(makePostRequest('42', { rating: 5 }), { params: makeParams('42') });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('validates rating must be between 1 and 5', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    // Rating too low (0)
    const res0 = await POST(makePostRequest('42', { rating: 0 }), { params: makeParams('42') });
    const json0 = await res0.json();
    expect(res0.status).toBe(400);
    expect(json0.error.code).toBe('INVALID_RATING');

    // Rating too high (6)
    const res6 = await POST(makePostRequest('42', { rating: 6 }), { params: makeParams('42') });
    const json6 = await res6.json();
    expect(res6.status).toBe(400);
    expect(json6.error.code).toBe('INVALID_RATING');
  });

  it('rejects non-integer rating (3.5)', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const res = await POST(makePostRequest('42', { rating: 3.5 }), { params: makeParams('42') });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('INVALID_RATING');
  });

  it('creates review on success (new review)', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    // Check for existing review — none found
    const existingChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(existingChain);

    // Insert new review
    const insertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([fakeReview]),
    };
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue(insertChain);

    const res = await POST(makePostRequest('42', { rating: 4, comment: 'Great session!' }), { params: makeParams('42') });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.rating).toBe(4);
    expect(json.comment).toBe('Great session!');
  });

  it('updates existing review instead of creating duplicate', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    // Check for existing review — found one
    const existingChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([fakeReview]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(existingChain);

    // Update existing review
    const updatedReview = { ...fakeReview, rating: 5, comment: 'Updated!' };
    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([updatedReview]),
    };
    (db.update as ReturnType<typeof vi.fn>).mockReturnValue(updateChain);

    const res = await POST(makePostRequest('42', { rating: 5, comment: 'Updated!' }), { params: makeParams('42') });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.rating).toBe(5);
    expect(db.update).toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('returns 500 on DB error', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    // Check for existing review — throws
    const existingChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockRejectedValue(new Error('DB down')),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(existingChain);

    const res = await POST(makePostRequest('42', { rating: 4 }), { params: makeParams('42') });
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('returns 400 for invalid session id (NaN)', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const res = await POST(makePostRequest('abc', { rating: 4 }), { params: makeParams('abc') });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('INVALID_INPUT');
  });

  it('accepts rating at boundary value 1', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const existingChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(existingChain);

    const insertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ ...fakeReview, rating: 1 }]),
    };
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue(insertChain);

    const res = await POST(makePostRequest('42', { rating: 1 }), { params: makeParams('42') });
    expect(res.status).toBe(200);
  });

  it('accepts rating at boundary value 5', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const existingChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(existingChain);

    const insertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ ...fakeReview, rating: 5 }]),
    };
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue(insertChain);

    const res = await POST(makePostRequest('42', { rating: 5 }), { params: makeParams('42') });
    expect(res.status).toBe(200);
  });

  it('creates review with null comment when omitted', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const existingChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(existingChain);

    const insertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ ...fakeReview, comment: null }]),
    };
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue(insertChain);

    const res = await POST(makePostRequest('42', { rating: 3 }), { params: makeParams('42') });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.comment).toBeNull();
  });

  it('rejects negative rating', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const res = await POST(makePostRequest('42', { rating: -1 }), { params: makeParams('42') });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('INVALID_RATING');
  });
});
