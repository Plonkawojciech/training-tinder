import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  swipes: {
    swiperId: 'swiper_id',
    targetId: 'target_id',
    direction: 'direction',
  },
  matches: {
    user1Id: 'user1_id',
    user2Id: 'user2_id',
    score: 'score',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ _eq: val })),
  and: vi.fn((...conds: unknown[]) => ({ _and: conds })),
}));

import { GET, POST } from '@/app/api/swipes/route';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';

function makePostRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/swipes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/swipes', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 401 when not authorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns swiped IDs array', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        { targetId: 'user-1' },
        { targetId: 'user-2' },
      ]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.swipedIds).toEqual(['user-1', 'user-2']);
  });

  it('returns empty array when no swipes', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    const res = await GET();
    const json = await res.json();
    expect(json.swipedIds).toEqual([]);
  });
});

describe('POST /api/swipes', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 401 when not authorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await POST(makePostRequest({ targetId: 'user-2', direction: 'like' }));
    expect(res.status).toBe(401);
  });

  it('stores like action and checks for mutual like', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    // insert swipe (onConflictDoNothing)
    const insertChain = {
      values: vi.fn().mockReturnThis(),
      onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
    };
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue(insertChain);

    // theyLikedMe query -> no
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(selectChain);

    const res = await POST(makePostRequest({ targetId: 'user-2', direction: 'like' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.match).toBe(false);
  });

  it('stores pass action', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const insertChain = {
      values: vi.fn().mockReturnThis(),
      onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
    };
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue(insertChain);

    const res = await POST(makePostRequest({ targetId: 'user-2', direction: 'pass' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.match).toBe(false);
  });

  it('creates match on mutual like', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    // insert swipe
    const insertChain = {
      values: vi.fn().mockReturnThis(),
      onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
    };

    // theyLikedMe -> yes
    const theyLikedChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ swiperId: 'user-2', targetId: 'user-abc', direction: 'like' }]),
    };
    // existing match check (forward) -> no
    const matchCheck1 = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    // existing match check (reverse) -> no
    const matchCheck2 = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };

    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(theyLikedChain)
      .mockReturnValueOnce(matchCheck1)
      .mockReturnValueOnce(matchCheck2);

    // insert swipe, then insert match
    const insertMatchChain = {
      values: vi.fn().mockResolvedValue(undefined),
    };
    (db.insert as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(insertChain)
      .mockReturnValueOnce(insertMatchChain);

    const res = await POST(makePostRequest({ targetId: 'user-2', direction: 'like' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.match).toBe(true);
    expect(db.insert).toHaveBeenCalledTimes(2);
  });

  it('returns 400 for invalid direction', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const res = await POST(makePostRequest({ targetId: 'user-2', direction: 'superlike' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when targetId is missing', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const res = await POST(makePostRequest({ direction: 'like' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when direction is missing', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const res = await POST(makePostRequest({ targetId: 'user-2' }));
    expect(res.status).toBe(400);
  });

  it('duplicate swipe is idempotent (onConflictDoNothing)', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const insertChain = {
      values: vi.fn().mockReturnThis(),
      onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
    };
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue(insertChain);
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(selectChain);

    const res = await POST(makePostRequest({ targetId: 'user-2', direction: 'like' }));
    expect(res.status).toBe(200);
    expect(insertChain.onConflictDoNothing).toHaveBeenCalled();
  });

  it('does not create duplicate match if already exists', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const insertChain = {
      values: vi.fn().mockReturnThis(),
      onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
    };

    const theyLikedChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ swiperId: 'user-2' }]),
    };
    // forward match check -> found
    const existingMatchChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ user1Id: 'user-abc', user2Id: 'user-2' }]),
    };
    // reverse match check (always runs)
    const existingMatchReverseChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };

    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(theyLikedChain)
      .mockReturnValueOnce(existingMatchChain)
      .mockReturnValueOnce(existingMatchReverseChain);

    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue(insertChain);

    const res = await POST(makePostRequest({ targetId: 'user-2', direction: 'like' }));
    const json = await res.json();

    expect(json.match).toBe(true);
    // Should only call insert once (for swipe), not for match
    expect(db.insert).toHaveBeenCalledTimes(1);
  });
});
