import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock('@/lib/db/schema', () => ({
  authUsers: { email: 'email' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ _eq: val })),
}));

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
  },
}));

vi.mock('@/lib/jwt', () => ({
  signToken: vi.fn().mockResolvedValue('mock-jwt-token'),
  COOKIE_NAME: 'tt_auth',
}));

vi.mock('@/lib/rate-limit', () => ({
  isRateLimited: vi.fn().mockReturnValue(false),
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}));

import { POST } from '@/app/api/auth/login/route';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { isRateLimited } from '@/lib/rate-limit';

// Helper: build a chain mock for db.select().from().where().limit()
function mockDbChain(rows: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  };
  (db.select as ReturnType<typeof vi.fn>).mockReturnValue(chain);
  return chain;
}

function makeRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const fakeUser = {
  id: 1,
  email: 'wojtek@example.com',
  passwordHash: '$2b$12$validhashhere',
  displayName: 'Wojtek',
  createdAt: new Date(),
};

// --- Tests ---

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (isRateLimited as ReturnType<typeof vi.fn>).mockReturnValue(false);
  });

  it('returns 200 + success on correct credentials', async () => {
    mockDbChain([fakeUser]);
    (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const res = await POST(makeRequest({ email: 'wojtek@example.com', password: 'Str0ng!Pass' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    // Cookie should be set
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toContain('tt_auth');
  });

  it('returns 401 on wrong password', async () => {
    mockDbChain([fakeUser]);
    (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const res = await POST(makeRequest({ email: 'wojtek@example.com', password: 'wrongpass' }));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns 401 when user not found (no timing leak)', async () => {
    mockDbChain([]); // no user
    (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const res = await POST(makeRequest({ email: 'nobody@example.com', password: 'whatever' }));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe('INVALID_CREDENTIALS');
    // bcrypt.compare should still be called (timing-safe)
    expect(bcrypt.compare).toHaveBeenCalled();
  });

  it('returns 429 when rate limited', async () => {
    (isRateLimited as ReturnType<typeof vi.fn>).mockReturnValue(true);

    const res = await POST(makeRequest({ email: 'wojtek@example.com', password: 'pass' }));
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.error.code).toBe('RATE_LIMITED');
  });

  it('returns 400 when email is missing', async () => {
    const res = await POST(makeRequest({ password: 'somepass' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('MISSING_FIELDS');
  });

  it('returns 400 when password is missing', async () => {
    const res = await POST(makeRequest({ email: 'wojtek@example.com' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('MISSING_FIELDS');
  });

  it('returns 400 when both email and password are missing', async () => {
    const res = await POST(makeRequest({}));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('MISSING_FIELDS');
  });

  it('returns 400 when email is not a string (number)', async () => {
    const res = await POST(makeRequest({ email: 12345, password: 'pass' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('MISSING_FIELDS');
  });

  it('returns 400 when password is not a string (array)', async () => {
    const res = await POST(makeRequest({ email: 'a@b.com', password: ['x'] }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('MISSING_FIELDS');
  });

  it('returns 400 when email is empty string after trim', async () => {
    const res = await POST(makeRequest({ email: '   ', password: 'pass123' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('MISSING_FIELDS');
  });

  it('returns 400 when email exceeds 254 chars', async () => {
    const longEmail = 'a'.repeat(255) + '@example.com';
    const res = await POST(makeRequest({ email: longEmail, password: 'pass' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('INVALID_INPUT');
  });

  it('returns 400 when password exceeds 1024 chars', async () => {
    const longPass = 'x'.repeat(1025);
    const res = await POST(makeRequest({ email: 'a@b.com', password: longPass }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('INVALID_INPUT');
  });

  it('normalizes email to lowercase', async () => {
    mockDbChain([fakeUser]);
    (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    await POST(makeRequest({ email: '  Wojtek@Example.COM  ', password: 'pass' }));

    // eq() should have been called with the lowercased, trimmed email
    const { eq } = await import('drizzle-orm');
    expect(eq).toHaveBeenCalledWith('email', 'wojtek@example.com');
  });
});
