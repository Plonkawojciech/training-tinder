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
  friends: {
    id: 'id',
    requesterId: 'requester_id',
    receiverId: 'receiver_id',
    status: 'status',
    updatedAt: 'updated_at',
  },
  users: {
    authEmail: 'clerk_id',
    username: 'username',
    avatarUrl: 'avatar_url',
    city: 'city',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ _eq: val })),
  and: vi.fn((...conds: unknown[]) => ({ _and: conds })),
  or: vi.fn((...conds: unknown[]) => ({ _or: conds })),
  inArray: vi.fn((_col: unknown, vals: unknown) => ({ _inArray: vals })),
  ilike: vi.fn((_col: unknown, val: unknown) => ({ _ilike: val })),
}));

import { GET, POST } from '@/app/api/friends/route';
import { PATCH, DELETE } from '@/app/api/friends/[id]/route';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';

function makePostRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/friends', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makePatchRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/friends/1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(): Request {
  return new Request('http://localhost:3000/api/friends/1', { method: 'DELETE' });
}

const makeParams = (id: string) => Promise.resolve({ id });

describe('GET /api/friends', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 401 when not authorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns friends list with enriched user data', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    // friends query
    const friendsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        { id: 1, requesterId: 'user-abc', receiverId: 'user-xyz', status: 'accepted' },
      ]),
    };
    // batch user fetch
    const usersChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        { authEmail: 'user-xyz', username: 'jan', avatarUrl: null, city: 'Kraków' },
      ]),
    };
    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(friendsChain)
      .mockReturnValueOnce(usersChain);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json[0].otherUser.username).toBe('jan');
  });

  it('returns empty array when no friends', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const friendsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(friendsChain);

    const res = await GET();
    const json = await res.json();
    expect(json).toEqual([]);
  });
});

describe('POST /api/friends (send request)', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 401 when not authorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await POST(makePostRequest({ query: 'jan' }));
    expect(res.status).toBe(401);
  });

  it('creates pending friend request', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    // find target user
    const targetChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ authEmail: 'user-xyz', username: 'jan', avatarUrl: null }]),
    };
    // check existing friendship
    const existingChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(targetChain)
      .mockReturnValueOnce(existingChain);

    const insertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: 1, requesterId: 'user-abc', receiverId: 'user-xyz', status: 'pending' }]),
    };
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue(insertChain);

    const res = await POST(makePostRequest({ query: 'jan' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.friend.status).toBe('pending');
  });

  it('returns 400 for self-request', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const targetChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ authEmail: 'user-abc', username: 'wojtek' }]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(targetChain);

    const res = await POST(makePostRequest({ query: 'wojtek' }));
    expect(res.status).toBe(400);
  });

  it('returns 409 for duplicate request', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const targetChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ authEmail: 'user-xyz', username: 'jan' }]),
    };
    const existingChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ id: 1, status: 'pending' }]),
    };
    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(targetChain)
      .mockReturnValueOnce(existingChain);

    const res = await POST(makePostRequest({ query: 'jan' }));
    expect(res.status).toBe(409);
  });

  it('returns 400 when query is empty', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const res = await POST(makePostRequest({ query: '' }));
    expect(res.status).toBe(400);
  });

  it('returns 404 when user not found', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const targetChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(targetChain);

    const res = await POST(makePostRequest({ query: 'nieistniejacy' }));
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/friends/[id]', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 401 when not authorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await PATCH(makePatchRequest({ action: 'accept' }), { params: makeParams('1') });
    expect(res.status).toBe(401);
  });

  it('accepts friend request -> status=accepted', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-xyz');
    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: 1, status: 'accepted' }]),
    };
    (db.update as ReturnType<typeof vi.fn>).mockReturnValue(updateChain);

    const res = await PATCH(makePatchRequest({ action: 'accept' }), { params: makeParams('1') });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.friend.status).toBe('accepted');
  });

  it('rejects friend request -> status=rejected', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-xyz');
    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: 1, status: 'rejected' }]),
    };
    (db.update as ReturnType<typeof vi.fn>).mockReturnValue(updateChain);

    const res = await PATCH(makePatchRequest({ action: 'reject' }), { params: makeParams('1') });
    const json = await res.json();
    expect(json.friend.status).toBe('rejected');
  });

  it('returns 400 for invalid id (NaN)', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-xyz');
    const res = await PATCH(makePatchRequest({ action: 'accept' }), { params: makeParams('abc') });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/friends/[id]', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 401 when not authorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await DELETE(makeDeleteRequest(), { params: makeParams('1') });
    expect(res.status).toBe(401);
  });

  it('deletes friendship successfully', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const deleteChain = {
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: 1 }]),
    };
    (db.delete as ReturnType<typeof vi.fn>).mockReturnValue(deleteChain);

    const res = await DELETE(makeDeleteRequest(), { params: makeParams('1') });
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it('returns 404 when friendship not found', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const deleteChain = {
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([]),
    };
    (db.delete as ReturnType<typeof vi.fn>).mockReturnValue(deleteChain);

    const res = await DELETE(makeDeleteRequest(), { params: makeParams('1') });
    expect(res.status).toBe(404);
  });
});
