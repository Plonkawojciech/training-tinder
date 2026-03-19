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
  messages: {
    senderId: 'sender_id',
    receiverId: 'receiver_id',
    content: 'content',
    createdAt: 'created_at',
  },
  users: {
    authEmail: 'clerk_id',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ _eq: val })),
  and: vi.fn((...conds: unknown[]) => ({ _and: conds })),
  or: vi.fn((...conds: unknown[]) => ({ _or: conds })),
  desc: vi.fn((col: unknown) => ({ _desc: col })),
}));

vi.mock('@/lib/rate-limit', () => ({
  isRateLimited: vi.fn().mockReturnValue(false),
}));

vi.mock('pusher', () => ({
  default: vi.fn().mockImplementation(() => ({
    trigger: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('@/lib/push', () => ({
  sendPushToUser: vi.fn().mockResolvedValue(undefined),
}));

import { GET } from '@/app/api/messages/route';
import { POST } from '@/app/api/messages/send/route';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { isRateLimited } from '@/lib/rate-limit';

function makeGetRequest(params: Record<string, string> = {}): Request {
  const url = new URL('http://localhost:3000/api/messages');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url.toString(), { method: 'GET' });
}

function makePostRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/messages/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const fakeMessage = {
  id: 1,
  senderId: 'user-abc',
  receiverId: 'user-xyz',
  content: 'Hej, biegamy?',
  createdAt: new Date().toISOString(),
};

// --- GET /api/messages tests ---

describe('GET /api/messages', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (isRateLimited as ReturnType<typeof vi.fn>).mockReturnValue(false);
  });

  it('returns 401 when not authorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await GET(makeGetRequest({ partnerId: 'user-xyz' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when partnerId is missing', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const res = await GET(makeGetRequest());
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error.code).toBe('MISSING_FIELDS');
  });

  it('returns paginated messages (default limit 50)', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockResolvedValue([fakeMessage]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    const res = await GET(makeGetRequest({ partnerId: 'user-xyz' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(json)).toBe(true);
    expect(json[0].content).toBe('Hej, biegamy?');
  });

  it('returns messages ordered desc by createdAt', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    const res = await GET(makeGetRequest({ partnerId: 'user-xyz' }));
    expect(res.status).toBe(200);
    const { desc } = await import('drizzle-orm');
    expect(desc).toHaveBeenCalledWith('created_at');
  });

  it('returns empty array when no messages', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    const res = await GET(makeGetRequest({ partnerId: 'user-xyz' }));
    const json = await res.json();
    expect(json).toEqual([]);
  });

  it('respects offset/limit pagination params', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    await GET(makeGetRequest({ partnerId: 'user-xyz', limit: '10', offset: '20' }));
    expect(chain.limit).toHaveBeenCalledWith(10);
    expect(chain.offset).toHaveBeenCalledWith(20);
  });

  it('caps limit at 200', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    await GET(makeGetRequest({ partnerId: 'user-xyz', limit: '999' }));
    expect(chain.limit).toHaveBeenCalledWith(200);
  });
});

// --- POST /api/messages/send tests ---

describe('POST /api/messages/send', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (isRateLimited as ReturnType<typeof vi.fn>).mockReturnValue(false);
  });

  it('returns 401 when not authorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await POST(makePostRequest({ receiverId: 'user-xyz', content: 'hi' }));
    expect(res.status).toBe(401);
  });

  it('sends valid message successfully', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    // receiver exists query
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ authEmail: 'user-xyz' }]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(selectChain);
    // insert message
    const insertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([fakeMessage]),
    };
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue(insertChain);

    const res = await POST(makePostRequest({ receiverId: 'user-xyz', content: 'Hej, biegamy?' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.content).toBe('Hej, biegamy?');
  });

  it('returns 429 when rate limited (30/min)', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    (isRateLimited as ReturnType<typeof vi.fn>).mockReturnValue(true);

    const res = await POST(makePostRequest({ receiverId: 'user-xyz', content: 'hi' }));
    expect(res.status).toBe(429);
  });

  it('returns 400 when content exceeds 2000 chars', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const res = await POST(makePostRequest({ receiverId: 'user-xyz', content: 'x'.repeat(2001) }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('CONTENT_TOO_LONG');
  });

  it('returns 400 when content is empty', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const res = await POST(makePostRequest({ receiverId: 'user-xyz', content: '' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when receiverId is missing', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const res = await POST(makePostRequest({ content: 'hello' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when sending to self', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const res = await POST(makePostRequest({ receiverId: 'user-abc', content: 'hi me' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('SELF_ACTION');
  });

  it('returns 404 when receiver does not exist', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(selectChain);

    const res = await POST(makePostRequest({ receiverId: 'ghost', content: 'hello' }));
    expect(res.status).toBe(404);
  });
});
