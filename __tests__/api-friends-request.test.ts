import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---

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
  friends: {
    id: 'id',
    requesterId: 'requester_id',
    receiverId: 'receiver_id',
    status: 'status',
    createdAt: 'created_at',
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
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';

function makePostRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/friends', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// --- POST tests (send friend request) ---

describe('POST /api/friends (send friend request)', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 401 when not authorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await POST(makePostRequest({ query: 'jan' }));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 when query is missing', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const res = await POST(makePostRequest({ query: '' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('MISSING_FIELDS');
  });

  it('returns 400 when query is whitespace only', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const res = await POST(makePostRequest({ query: '   ' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('MISSING_FIELDS');
  });

  it('returns 400 when trying to friend self', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    // Target user lookup returns the same user
    const targetChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ authEmail: 'user-abc', username: 'wojtek', avatarUrl: null }]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(targetChain);

    const res = await POST(makePostRequest({ query: 'wojtek' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('SELF_ACTION');
  });

  it('returns 409 when already friends or request pending', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    // Target user lookup
    const targetChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ authEmail: 'user-xyz', username: 'jan', avatarUrl: null }]),
    };
    // Existing friendship found
    const existingChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ id: 1, status: 'pending' }]),
    };
    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(targetChain)
      .mockReturnValueOnce(existingChain);

    const res = await POST(makePostRequest({ query: 'jan' }));
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error.code).toBe('ALREADY_FRIENDS');
  });

  it('creates pending friend request on success', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    // Target user lookup
    const targetChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ authEmail: 'user-xyz', username: 'jan', avatarUrl: 'https://img/jan.jpg' }]),
    };
    // No existing friendship
    const existingChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(targetChain)
      .mockReturnValueOnce(existingChain);

    // Insert friend request
    const insertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{
        id: 1,
        requesterId: 'user-abc',
        receiverId: 'user-xyz',
        status: 'pending',
      }]),
    };
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue(insertChain);

    const res = await POST(makePostRequest({ query: 'jan' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.friend.status).toBe('pending');
    expect(json.friend.requesterId).toBe('user-abc');
    expect(json.friend.receiverId).toBe('user-xyz');
  });

  it('returns { ok: true } with target user info', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const targetChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ authEmail: 'user-xyz', username: 'jan', avatarUrl: 'https://img/jan.jpg' }]),
    };
    const existingChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(targetChain)
      .mockReturnValueOnce(existingChain);

    const insertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{
        id: 1, requesterId: 'user-abc', receiverId: 'user-xyz', status: 'pending',
      }]),
    };
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue(insertChain);

    const res = await POST(makePostRequest({ query: 'jan' }));
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(json.targetUser.username).toBe('jan');
    expect(json.targetUser.avatarUrl).toBe('https://img/jan.jpg');
  });

  it('returns 500 on DB error during insert', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const targetChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ authEmail: 'user-xyz', username: 'jan', avatarUrl: null }]),
    };
    const existingChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(targetChain)
      .mockReturnValueOnce(existingChain);

    const insertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockRejectedValue(new Error('DB insert failed')),
    };
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue(insertChain);

    const res = await POST(makePostRequest({ query: 'jan' }));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('returns 404 when target user not found', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const targetChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(targetChain);

    const res = await POST(makePostRequest({ query: 'nieistniejacy' }));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error.code).toBe('NOT_FOUND');
  });
});

// --- GET tests ---

describe('GET /api/friends', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 401 when not authorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns accepted friends with enriched user data', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    // Friends query
    const friendsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        { id: 1, requesterId: 'user-abc', receiverId: 'user-xyz', status: 'accepted' },
        { id: 2, requesterId: 'user-def', receiverId: 'user-abc', status: 'pending' },
      ]),
    };
    // Batch user fetch
    const usersChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        { authEmail: 'user-xyz', username: 'jan', avatarUrl: null, city: 'Krakow' },
        { authEmail: 'user-def', username: 'anna', avatarUrl: 'https://img/anna.jpg', city: 'Warszawa' },
      ]),
    };
    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(friendsChain)
      .mockReturnValueOnce(usersChain);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(json)).toBe(true);
    expect(json).toHaveLength(2);
    // First friend: user-abc is requester, so otherUser is user-xyz
    expect(json[0].otherUser.username).toBe('jan');
    // Second friend: user-def is requester, user-abc is receiver, so otherUser is user-def
    expect(json[1].otherUser.username).toBe('anna');
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

    expect(res.status).toBe(200);
    expect(json).toEqual([]);
  });

  it('returns 500 on DB error in GET', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const friendsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockRejectedValue(new Error('DB down')),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(friendsChain);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('enriched friends include city field', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const friendsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        { id: 1, requesterId: 'user-abc', receiverId: 'user-xyz', status: 'accepted' },
      ]),
    };
    const usersChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        { authEmail: 'user-xyz', username: 'jan', avatarUrl: null, city: 'Gdansk' },
      ]),
    };
    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(friendsChain)
      .mockReturnValueOnce(usersChain);

    const res = await GET();
    const json = await res.json();

    expect(json[0].otherUser.city).toBe('Gdansk');
  });

  it('does not batch-fetch users when no friends exist', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const friendsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(friendsChain);

    await GET();

    // Only one db.select call (for friends), not a second one (for users)
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it('preserves friend status in response', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const friendsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        { id: 1, requesterId: 'user-abc', receiverId: 'user-xyz', status: 'pending' },
        { id: 2, requesterId: 'user-abc', receiverId: 'user-def', status: 'accepted' },
      ]),
    };
    const usersChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        { authEmail: 'user-xyz', username: 'jan', avatarUrl: null, city: null },
        { authEmail: 'user-def', username: 'anna', avatarUrl: null, city: null },
      ]),
    };
    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(friendsChain)
      .mockReturnValueOnce(usersChain);

    const res = await GET();
    const json = await res.json();

    expect(json[0].status).toBe('pending');
    expect(json[1].status).toBe('accepted');
  });

  it('otherUser resolves to receiver when current user is requester', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const friendsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        { id: 1, requesterId: 'user-abc', receiverId: 'user-xyz', status: 'accepted' },
      ]),
    };
    const usersChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        { authEmail: 'user-xyz', username: 'jan', avatarUrl: null, city: null },
      ]),
    };
    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(friendsChain)
      .mockReturnValueOnce(usersChain);

    const res = await GET();
    const json = await res.json();

    expect(json[0].otherUser.username).toBe('jan');
  });

  it('otherUser resolves to requester when current user is receiver', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-xyz');

    const friendsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        { id: 1, requesterId: 'user-abc', receiverId: 'user-xyz', status: 'accepted' },
      ]),
    };
    const usersChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        { authEmail: 'user-abc', username: 'wojtek', avatarUrl: null, city: null },
      ]),
    };
    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(friendsChain)
      .mockReturnValueOnce(usersChain);

    const res = await GET();
    const json = await res.json();

    expect(json[0].otherUser.username).toBe('wojtek');
  });

  it('GET response is an array', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const friendsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(friendsChain);

    const res = await GET();
    const json = await res.json();

    expect(Array.isArray(json)).toBe(true);
  });
});
