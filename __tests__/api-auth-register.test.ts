import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock('@/lib/db/schema', () => ({
  authUsers: {
    id: 'id',
    email: 'email',
    passwordHash: 'password_hash',
    displayName: 'display_name',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ _eq: val })),
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2b$12$mockedhashvalue'),
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

import { POST } from '@/app/api/auth/register/route';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/jwt';
import { isRateLimited } from '@/lib/rate-limit';

// Helper: mock db.select().from().where().limit() chain (for duplicate check)
function mockSelectChain(rows: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  };
  (db.select as ReturnType<typeof vi.fn>).mockReturnValue(chain);
  return chain;
}

// Helper: mock db.insert().values() chain
function mockInsertChain() {
  const chain = {
    values: vi.fn().mockResolvedValue(undefined),
  };
  (db.insert as ReturnType<typeof vi.fn>).mockReturnValue(chain);
  return chain;
}

function makeRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// --- Tests ---

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (isRateLimited as ReturnType<typeof vi.fn>).mockReturnValue(false);
    (bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue('$2b$12$mockedhashvalue');
    (signToken as ReturnType<typeof vi.fn>).mockResolvedValue('mock-jwt-token');
  });

  it('returns 200 + success on valid registration', async () => {
    mockSelectChain([]); // no existing user
    mockInsertChain();

    const res = await POST(makeRequest({
      email: 'newuser@example.com',
      password: 'Str0ng!Pass',
      displayName: 'Wojtek',
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it('sets JWT cookie on successful registration', async () => {
    mockSelectChain([]); // no existing user
    mockInsertChain();

    const res = await POST(makeRequest({
      email: 'newuser@example.com',
      password: 'Str0ng!Pass',
    }));

    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toContain('tt_auth');
    expect(setCookie).toContain('mock-jwt-token');
  });

  it('calls signToken with normalized email', async () => {
    mockSelectChain([]);
    mockInsertChain();

    await POST(makeRequest({
      email: '  NewUser@EXAMPLE.COM  ',
      password: 'Str0ng!Pass',
    }));

    expect(signToken).toHaveBeenCalledWith('newuser@example.com');
  });

  it('returns 400 with generic error when email already exists (no enumeration)', async () => {
    mockSelectChain([{ id: 1 }]); // existing user found

    const res = await POST(makeRequest({
      email: 'existing@example.com',
      password: 'Str0ng!Pass',
    }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('INVALID_REGISTRATION_DATA');
  });

  it('returns 400 when password is too short (< 8 chars)', async () => {
    const res = await POST(makeRequest({
      email: 'test@example.com',
      password: 'short',
    }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('WEAK_PASSWORD');
  });

  it('returns 400 when password is exactly 7 chars', async () => {
    const res = await POST(makeRequest({
      email: 'test@example.com',
      password: '1234567',
    }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('WEAK_PASSWORD');
  });

  it('accepts password of exactly 8 chars', async () => {
    mockSelectChain([]);
    mockInsertChain();

    const res = await POST(makeRequest({
      email: 'test@example.com',
      password: '12345678',
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it('returns 400 when password exceeds 1024 chars', async () => {
    const longPass = 'x'.repeat(1025);
    const res = await POST(makeRequest({
      email: 'test@example.com',
      password: longPass,
    }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('INVALID_INPUT');
  });

  it('returns 400 when email is missing', async () => {
    const res = await POST(makeRequest({ password: 'Str0ng!Pass' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('MISSING_FIELDS');
  });

  it('returns 400 when password is missing', async () => {
    const res = await POST(makeRequest({ email: 'test@example.com' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('MISSING_FIELDS');
  });

  it('returns 400 when email is not a string', async () => {
    const res = await POST(makeRequest({ email: 12345, password: 'Str0ng!Pass' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('MISSING_FIELDS');
  });

  it('returns 400 when email is empty after trim', async () => {
    const res = await POST(makeRequest({ email: '   ', password: 'Str0ng!Pass' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('MISSING_FIELDS');
  });

  it('normalizes email to lowercase and trims whitespace', async () => {
    mockSelectChain([]);
    mockInsertChain();

    await POST(makeRequest({
      email: '  Wojtek@Example.COM  ',
      password: 'Str0ng!Pass',
    }));

    // eq() should have been called with the lowercased, trimmed email
    const { eq } = await import('drizzle-orm');
    expect(eq).toHaveBeenCalledWith('email', 'wojtek@example.com');
  });

  it('returns 400 when email exceeds 254 chars', async () => {
    const longEmail = 'a'.repeat(250) + '@b.com';
    const res = await POST(makeRequest({ email: longEmail, password: 'Str0ng!Pass' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('INVALID_EMAIL_FORMAT');
  });

  it('returns 400 when email has invalid format', async () => {
    const res = await POST(makeRequest({ email: 'not-an-email', password: 'Str0ng!Pass' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('INVALID_EMAIL_FORMAT');
  });

  it('returns 429 when rate limited', async () => {
    (isRateLimited as ReturnType<typeof vi.fn>).mockReturnValue(true);

    const res = await POST(makeRequest({ email: 'test@example.com', password: 'Str0ng!Pass' }));
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.error.code).toBe('RATE_LIMITED');
  });

  it('hashes the password with bcrypt (cost 12)', async () => {
    mockSelectChain([]);
    mockInsertChain();

    await POST(makeRequest({
      email: 'test@example.com',
      password: 'Str0ng!Pass',
    }));

    expect(bcrypt.hash).toHaveBeenCalledWith('Str0ng!Pass', 12);
  });

  it('truncates displayName to 60 chars', async () => {
    mockSelectChain([]);
    const insertChain = mockInsertChain();

    const longName = 'A'.repeat(100);
    await POST(makeRequest({
      email: 'test@example.com',
      password: 'Str0ng!Pass',
      displayName: longName,
    }));

    const valuesCall = insertChain.values.mock.calls[0][0];
    expect(valuesCall.displayName).toBe('A'.repeat(60));
  });
});
