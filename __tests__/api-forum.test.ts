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
  forumPosts: {
    id: 'id',
    userId: 'user_id',
    title: 'title',
    content: 'content',
    category: 'category',
    createdAt: 'created_at',
    commentsCount: 'comments_count',
    likesCount: 'likes_count',
    imageUrl: 'image_url',
    workoutLogId: 'workout_log_id',
    sessionId: 'session_id',
  },
  forumComments: {
    id: 'id',
    postId: 'post_id',
    userId: 'user_id',
    content: 'content',
    createdAt: 'created_at',
  },
  forumLikes: {
    userId: 'user_id',
    postId: 'post_id',
  },
  activityFeed: {},
  users: {
    authEmail: 'clerk_id',
    username: 'username',
    avatarUrl: 'avatar_url',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ _eq: val })),
  and: vi.fn((...conds: unknown[]) => ({ _and: conds })),
  or: vi.fn((...conds: unknown[]) => ({ _or: conds })),
  desc: vi.fn((col: unknown) => ({ _desc: col })),
  asc: vi.fn((col: unknown) => ({ _asc: col })),
  inArray: vi.fn((_col: unknown, vals: unknown) => ({ _inArray: vals })),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
}));

vi.mock('@/lib/rate-limit', () => ({
  isRateLimited: vi.fn().mockReturnValue(false),
}));

import { GET as GetPosts, POST as CreatePost } from '@/app/api/forum/posts/route';
import { GET as GetPost, DELETE as DeletePost } from '@/app/api/forum/posts/[id]/route';
import { POST as CreateComment } from '@/app/api/forum/posts/[id]/comments/route';
import { POST as ToggleLike } from '@/app/api/forum/posts/[id]/like/route';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { isRateLimited } from '@/lib/rate-limit';

function makeGetRequest(params: Record<string, string> = {}, path = '/api/forum/posts'): Request {
  const url = new URL(`http://localhost:3000${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url.toString(), { method: 'GET' });
}

function makePostRequest(body: unknown, path = '/api/forum/posts'): Request {
  return new Request(`http://localhost:3000${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const makeParams = (id: string) => Promise.resolve({ id });

const fakePost = {
  id: 1,
  userId: 'user-abc',
  title: 'Porady dla biegaczy',
  content: 'Rozpoczynając bieganie, pamiętaj o rozgrzewce...',
  category: 'training',
  commentsCount: 0,
  likesCount: 0,
  createdAt: new Date().toISOString(),
};

// --- GET /api/forum/posts ---

describe('GET /api/forum/posts', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 401 when not authorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await GetPosts(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it('returns paginated posts', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    // The GET route builds two separate queries — the first (with category != 'all') doesn't apply,
    // so it uses the base query chain: db.select().from().orderBy().limit().offset()
    const postsChain = {
      from: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockResolvedValue([fakePost]),
    };
    // authors batch
    const authorsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ authEmail: 'user-abc', username: 'wojtek', avatarUrl: null }]),
    };
    // count query — also .from() without .where() when no category
    const countChain = {
      from: vi.fn().mockResolvedValue([{ count: 1 }]),
    };
    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(postsChain)   // first db.select for the "query" variable
      .mockReturnValueOnce(authorsChain)
      .mockReturnValueOnce(countChain);

    const res = await GetPosts(makeGetRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.posts).toHaveLength(1);
    expect(json.posts[0].username).toBe('wojtek');
    expect(json.total).toBe(1);
  });

  it('returns empty posts array', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const postsChain = {
      from: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockResolvedValue([]),
    };
    const countChain = {
      from: vi.fn().mockResolvedValue([{ count: 0 }]),
    };
    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(postsChain)
      .mockReturnValueOnce(countChain);

    const res = await GetPosts(makeGetRequest());
    const json = await res.json();
    expect(json.posts).toEqual([]);
  });
});

// --- POST /api/forum/posts ---

describe('POST /api/forum/posts', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (isRateLimited as ReturnType<typeof vi.fn>).mockReturnValue(false);
  });

  it('returns 401 when not authorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await CreatePost(makePostRequest({ title: 'Test', content: 'Content text here', category: 'general' }));
    expect(res.status).toBe(401);
  });

  it('creates post with valid data', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const insertPostChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([fakePost]),
    };
    const insertFeedChain = {
      values: vi.fn().mockResolvedValue(undefined),
    };
    (db.insert as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(insertPostChain)
      .mockReturnValueOnce(insertFeedChain);

    const res = await CreatePost(makePostRequest({
      title: 'Porady dla biegaczy',
      content: 'Rozpoczynając bieganie, pamiętaj o rozgrzewce...',
      category: 'training',
    }));

    expect(res.status).toBe(201);
  });

  it('returns 400 when title is too short (<3 chars)', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const res = await CreatePost(makePostRequest({ title: 'AB', content: 'Valid content text here.', category: 'general' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when title exceeds 200 chars', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const res = await CreatePost(makePostRequest({ title: 'A'.repeat(201), content: 'Valid content.', category: 'general' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when content is too short (<10 chars)', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const res = await CreatePost(makePostRequest({ title: 'Valid Title', content: 'Short', category: 'general' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when content exceeds 10000 chars', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const res = await CreatePost(makePostRequest({ title: 'Valid Title', content: 'x'.repeat(10001), category: 'general' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid category', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const res = await CreatePost(makePostRequest({ title: 'Valid Title', content: 'Valid content text.', category: 'invalid_cat' }));
    expect(res.status).toBe(400);
  });

  it('returns 429 when rate limited', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    (isRateLimited as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const res = await CreatePost(makePostRequest({ title: 'Test', content: 'Content text here.', category: 'general' }));
    expect(res.status).toBe(429);
  });
});

// --- GET /api/forum/posts/[id] ---

describe('GET /api/forum/posts/[id]', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 401 when not authorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await GetPost(makeGetRequest({}, '/api/forum/posts/1'), { params: makeParams('1') });
    expect(res.status).toBe(401);
  });

  it('returns post with comments and isLiked', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    // post query
    const postChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([fakePost]),
    };
    // Promise.all: comments + likes
    const commentsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    const likesChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    // users batch
    const usersChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ authEmail: 'user-abc', username: 'wojtek', avatarUrl: null }]),
    };
    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(postChain)
      .mockReturnValueOnce(commentsChain)
      .mockReturnValueOnce(likesChain)
      .mockReturnValueOnce(usersChain);

    const res = await GetPost(makeGetRequest({}, '/api/forum/posts/1'), { params: makeParams('1') });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.post.title).toBe('Porady dla biegaczy');
    expect(json.isLiked).toBe(false);
  });

  it('returns 404 when post not found', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const postChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(postChain);

    const res = await GetPost(makeGetRequest({}, '/api/forum/posts/999'), { params: makeParams('999') });
    expect(res.status).toBe(404);
  });
});

// --- DELETE /api/forum/posts/[id] ---

describe('DELETE /api/forum/posts/[id]', () => {
  beforeEach(() => vi.resetAllMocks());

  it('deletes post with cascade (comments + likes)', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const postChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([fakePost]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(postChain);
    const deleteChain = {
      where: vi.fn().mockResolvedValue(undefined),
    };
    (db.delete as ReturnType<typeof vi.fn>).mockReturnValue(deleteChain);

    const res = await DeletePost(
      new Request('http://localhost:3000/api/forum/posts/1', { method: 'DELETE' }),
      { params: makeParams('1') }
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(db.delete).toHaveBeenCalledTimes(3);
  });

  it('returns 403 when not owner', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-other');
    const postChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([fakePost]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(postChain);

    const res = await DeletePost(
      new Request('http://localhost:3000/api/forum/posts/1', { method: 'DELETE' }),
      { params: makeParams('1') }
    );
    expect(res.status).toBe(403);
  });
});

// --- POST /api/forum/posts/[id]/comments ---

describe('POST /api/forum/posts/[id]/comments', () => {
  beforeEach(() => vi.resetAllMocks());

  it('creates comment on valid post', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    // check post exists
    const postCheckChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 1 }]),
    };
    // insert comment
    const insertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: 1, postId: 1, userId: 'user-abc', content: 'Świetny post!' }]),
    };
    // update comments count
    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(undefined),
    };
    // fetch author
    const authorChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ username: 'wojtek', avatarUrl: null }]),
    };

    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(postCheckChain)
      .mockReturnValueOnce(authorChain);
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue(insertChain);
    (db.update as ReturnType<typeof vi.fn>).mockReturnValue(updateChain);

    const res = await CreateComment(
      makePostRequest({ content: 'Świetny post!' }, '/api/forum/posts/1/comments'),
      { params: makeParams('1') }
    );

    expect(res.status).toBe(201);
  });

  it('returns 400 when content is empty', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const res = await CreateComment(
      makePostRequest({ content: '' }, '/api/forum/posts/1/comments'),
      { params: makeParams('1') }
    );
    expect(res.status).toBe(400);
  });
});

// --- POST /api/forum/posts/[id]/like ---

describe('POST /api/forum/posts/[id]/like', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 401 when not authorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await ToggleLike(
      makePostRequest({}, '/api/forum/posts/1/like'),
      { params: makeParams('1') }
    );
    expect(res.status).toBe(401);
  });

  it('likes a post (toggle on)', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    // post exists
    const postChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([fakePost]),
    };
    // no existing like
    const likeChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    // fetch updated count
    const countChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ likesCount: 1 }]),
    };
    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(postChain)
      .mockReturnValueOnce(likeChain)
      .mockReturnValueOnce(countChain);
    const insertChain = { values: vi.fn().mockResolvedValue(undefined) };
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue(insertChain);
    const updateChain = { set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue(undefined) };
    (db.update as ReturnType<typeof vi.fn>).mockReturnValue(updateChain);

    const res = await ToggleLike(
      makePostRequest({}, '/api/forum/posts/1/like'),
      { params: makeParams('1') }
    );
    const json = await res.json();

    expect(json.liked).toBe(true);
    expect(json.likesCount).toBe(1);
  });

  it('unlikes a post (toggle off)', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const postChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([fakePost]),
    };
    // existing like found
    const likeChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ userId: 'user-abc', postId: 1 }]),
    };
    const countChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ likesCount: 0 }]),
    };
    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(postChain)
      .mockReturnValueOnce(likeChain)
      .mockReturnValueOnce(countChain);
    const deleteChain = { where: vi.fn().mockResolvedValue(undefined) };
    (db.delete as ReturnType<typeof vi.fn>).mockReturnValue(deleteChain);
    const updateChain = { set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue(undefined) };
    (db.update as ReturnType<typeof vi.fn>).mockReturnValue(updateChain);

    const res = await ToggleLike(
      makePostRequest({}, '/api/forum/posts/1/like'),
      { params: makeParams('1') }
    );
    const json = await res.json();

    expect(json.liked).toBe(false);
    expect(json.likesCount).toBe(0);
  });
});
