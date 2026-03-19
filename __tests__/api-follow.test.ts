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
  userFollows: {
    followerId: 'follower_id',
    followingId: 'following_id',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ _eq: val })),
  and: vi.fn((...conds: unknown[]) => ({ _and: conds })),
}));

import { POST } from '@/app/api/follow/route';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';

function makePostRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/follow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/follow', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 401 when not authorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await POST(makePostRequest({ targetId: 'user-2' }));
    expect(res.status).toBe(401);
  });

  it('follows user (creates record)', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    // not already following
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(selectChain);
    const insertChain = {
      values: vi.fn().mockResolvedValue(undefined),
    };
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue(insertChain);

    const res = await POST(makePostRequest({ targetId: 'user-2' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.following).toBe(true);
  });

  it('unfollows user (deletes record)', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    // already following
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ followerId: 'user-abc', followingId: 'user-2' }]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(selectChain);
    const deleteChain = {
      where: vi.fn().mockResolvedValue(undefined),
    };
    (db.delete as ReturnType<typeof vi.fn>).mockReturnValue(deleteChain);

    const res = await POST(makePostRequest({ targetId: 'user-2' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.following).toBe(false);
  });

  it('toggle: follow then unfollow works', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    // First call: not following -> follow
    const selectChain1 = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(selectChain1);
    const insertChain = { values: vi.fn().mockResolvedValue(undefined) };
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue(insertChain);

    const res1 = await POST(makePostRequest({ targetId: 'user-2' }));
    const json1 = await res1.json();
    expect(json1.following).toBe(true);

    // Second call: already following -> unfollow
    vi.resetAllMocks();
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const selectChain2 = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ followerId: 'user-abc' }]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(selectChain2);
    const deleteChain = { where: vi.fn().mockResolvedValue(undefined) };
    (db.delete as ReturnType<typeof vi.fn>).mockReturnValue(deleteChain);

    const res2 = await POST(makePostRequest({ targetId: 'user-2' }));
    const json2 = await res2.json();
    expect(json2.following).toBe(false);
  });

  it('returns 400 for self-follow', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const res = await POST(makePostRequest({ targetId: 'user-abc' }));
    expect(res.status).toBe(400);
  });
});
