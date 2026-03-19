import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server-auth', () => ({
  getAuthUserId: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/lib/db/schema', () => ({
  friends: {
    requesterId: 'requester_id',
    receiverId: 'receiver_id',
    status: 'status',
  },
  workoutLogs: {
    id: 'id',
    userId: 'user_id',
    createdAt: 'created_at',
  },
  users: {
    authEmail: 'clerk_id',
    username: 'username',
    avatarUrl: 'avatar_url',
  },
  feedComments: {
    workoutLogId: 'workout_log_id',
    authorId: 'author_id',
  },
  feedLikes: {
    workoutLogId: 'workout_log_id',
    userId: 'user_id',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ _eq: val })),
  and: vi.fn((...conds: unknown[]) => ({ _and: conds })),
  or: vi.fn((...conds: unknown[]) => ({ _or: conds })),
  inArray: vi.fn((_col: unknown, vals: unknown) => ({ _inArray: vals })),
  desc: vi.fn((col: unknown) => ({ _desc: col })),
}));

import { GET } from '@/app/api/feed/route';
import { POST as POST_like } from '@/app/api/feed/[id]/like/route';
import { POST as POST_comment } from '@/app/api/feed/[id]/comments/route';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';

function makeGetRequest(params: Record<string, string> = {}): Request {
  const url = new URL('http://localhost:3000/api/feed');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url.toString(), { method: 'GET' });
}

describe('GET /api/feed', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 401 when not authorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it('returns empty array when no friends', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const friendsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(friendsChain);

    const res = await GET(makeGetRequest());
    const json = await res.json();
    expect(json).toEqual([]);
  });

  it('returns feed with enriched logs and comments', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const fakeLog = { id: 1, userId: 'user-xyz', title: 'Morning run', createdAt: new Date().toISOString() };

    // friends query
    const friendsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        { requesterId: 'user-abc', receiverId: 'user-xyz', status: 'accepted' },
      ]),
    };
    // logs query
    const logsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockResolvedValue([fakeLog]),
    };
    // log authors
    const logAuthorsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ authEmail: 'user-xyz', username: 'jan', avatarUrl: null }]),
    };
    // comments
    const commentsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    // likes
    const likesChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };

    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(friendsChain)
      .mockReturnValueOnce(logsChain)
      .mockReturnValueOnce(logAuthorsChain)
      .mockReturnValueOnce(commentsChain)
      .mockReturnValueOnce(likesChain);

    const res = await GET(makeGetRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(json)).toBe(true);
    expect(json[0].username).toBe('jan');
  });

  it('returns empty array when friends have no logs', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const friendsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        { requesterId: 'user-abc', receiverId: 'user-xyz', status: 'accepted' },
      ]),
    };
    const logsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(friendsChain)
      .mockReturnValueOnce(logsChain);

    const res = await GET(makeGetRequest());
    const json = await res.json();
    expect(json).toEqual([]);
  });

  it('enriches logs with comment authors', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const fakeLog = { id: 1, userId: 'user-xyz', createdAt: new Date().toISOString() };
    const fakeComment = { id: 1, workoutLogId: 1, authorId: 'user-abc', content: 'Nice!' };

    const friendsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ requesterId: 'user-abc', receiverId: 'user-xyz', status: 'accepted' }]),
    };
    const logsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockResolvedValue([fakeLog]),
    };
    const logAuthorsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ authEmail: 'user-xyz', username: 'jan', avatarUrl: null }]),
    };
    const commentsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([fakeComment]),
    };
    const commentAuthorsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ authEmail: 'user-abc', username: 'wojtek', avatarUrl: null }]),
    };
    const likesChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };

    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(friendsChain)
      .mockReturnValueOnce(logsChain)
      .mockReturnValueOnce(logAuthorsChain)
      .mockReturnValueOnce(commentsChain)
      .mockReturnValueOnce(commentAuthorsChain)
      .mockReturnValueOnce(likesChain);

    const res = await GET(makeGetRequest());
    const json = await res.json();

    expect(json[0].comments[0].authorName).toBe('wojtek');
  });

  it('respects limit parameter', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const friendsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ requesterId: 'user-abc', receiverId: 'user-xyz', status: 'accepted' }]),
    };
    const logsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(friendsChain)
      .mockReturnValueOnce(logsChain);

    await GET(makeGetRequest({ limit: '10' }));
    expect(logsChain.limit).toHaveBeenCalledWith(10);
  });
});

describe('POST /api/feed/[id]/like', () => {
  beforeEach(() => vi.resetAllMocks());

  function makeLikeRequest(): Request {
    return new Request('http://localhost:3000/api/feed/1/like', { method: 'POST' });
  }

  function makeLikeParams(id: string): { params: Promise<{ id: string }> } {
    return { params: Promise.resolve({ id }) };
  }

  it('returns 401 when unauthorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await POST_like(makeLikeRequest(), makeLikeParams('1'));
    expect(res.status).toBe(401);
  });

  it('returns 404 for non-existent workout log', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const logChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(logChain);

    const res = await POST_like(makeLikeRequest(), makeLikeParams('999'));
    expect(res.status).toBe(404);
  });

  it('likes when not already liked', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    // select for workoutLog check
    const logChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 1, userId: 'user-xyz' }]),
    };
    // select for existing like check
    const likeChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(logChain)
      .mockReturnValueOnce(likeChain);

    const insertChain = {
      values: vi.fn().mockResolvedValue(undefined),
    };
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue(insertChain);

    const res = await POST_like(makeLikeRequest(), makeLikeParams('1'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ liked: true });
    expect(db.insert).toHaveBeenCalled();
  });

  it('unlikes when already liked', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    // select for workoutLog check
    const logChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 1, userId: 'user-xyz' }]),
    };
    // select for existing like check - returns existing like
    const likeChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ workoutLogId: 1, userId: 'user-abc' }]),
    };
    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(logChain)
      .mockReturnValueOnce(likeChain);

    const deleteChain = {
      where: vi.fn().mockResolvedValue(undefined),
    };
    (db.delete as ReturnType<typeof vi.fn>).mockReturnValue(deleteChain);

    const res = await POST_like(makeLikeRequest(), makeLikeParams('1'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ liked: false });
    expect(db.delete).toHaveBeenCalled();
  });

  it('toggles like (auth required)', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    // First: like (not yet liked)
    const logChain1 = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 1, userId: 'user-xyz' }]),
    };
    const likeChain1 = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(logChain1)
      .mockReturnValueOnce(likeChain1);

    const insertChain = {
      values: vi.fn().mockResolvedValue(undefined),
    };
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue(insertChain);

    const res1 = await POST_like(makeLikeRequest(), makeLikeParams('1'));
    const json1 = await res1.json();
    expect(json1).toEqual({ liked: true });

    // Second: unlike (already liked)
    const logChain2 = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 1, userId: 'user-xyz' }]),
    };
    const likeChain2 = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ workoutLogId: 1, userId: 'user-abc' }]),
    };
    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(logChain2)
      .mockReturnValueOnce(likeChain2);

    const deleteChain = {
      where: vi.fn().mockResolvedValue(undefined),
    };
    (db.delete as ReturnType<typeof vi.fn>).mockReturnValue(deleteChain);

    const res2 = await POST_like(makeLikeRequest(), makeLikeParams('1'));
    const json2 = await res2.json();
    expect(json2).toEqual({ liked: false });
  });
});

describe('POST /api/feed/[id]/comments', () => {
  beforeEach(() => vi.resetAllMocks());

  function makeCommentParams(id: string): { params: Promise<{ id: string }> } {
    return { params: Promise.resolve({ id }) };
  }

  it('returns 400 for empty content', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    // select for workoutLog check
    const logChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 1, userId: 'user-abc' }]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(logChain);

    const request = new Request('http://localhost:3000/api/feed/1/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '' }),
    });

    const res = await POST_comment(request, makeCommentParams('1'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe('MISSING_FIELDS');
  });
});
