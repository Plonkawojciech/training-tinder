import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { signToken, COOKIE_NAME } from '@/lib/jwt';
import { db } from '@/lib/db';
import { authUsers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';
import { serverError, badRequest, rateLimited, ErrorCode } from '@/lib/api-errors';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  // Rate limit: 5 registrations per IP per hour
  const ip = getClientIp(request);
  if (isRateLimited(`register:${ip}`, 5, 60 * 60 * 1000)) {
    return rateLimited('Too many registrations. Try again in an hour.');
  }

  try {
    const body = await request.json() as { email?: unknown; password?: unknown; displayName?: unknown };

    if (typeof body.email !== 'string' || typeof body.password !== 'string') {
      return badRequest(ErrorCode.MISSING_FIELDS, 'Email and password required');
    }

    const email = body.email.trim().toLowerCase();
    const password = body.password;
    const displayName = typeof body.displayName === 'string' ? body.displayName.trim().slice(0, 60) : null;

    if (!email || !password) {
      return badRequest(ErrorCode.MISSING_FIELDS, 'Email and password required');
    }
    if (email.length > 254 || !EMAIL_RE.test(email)) {
      return badRequest(ErrorCode.INVALID_EMAIL_FORMAT, 'Invalid email format');
    }
    if (password.length < 8) {
      return badRequest(ErrorCode.WEAK_PASSWORD, 'Password must be at least 8 characters');
    }
    if (password.length > 1024) {
      return badRequest(ErrorCode.INVALID_INPUT, 'Password is too long');
    }

    // Always hash password first (timing-safe: prevents email enumeration via response timing)
    const passwordHash = await bcrypt.hash(password, 12);

    const [existing] = await db
      .select({ id: authUsers.id })
      .from(authUsers)
      .where(eq(authUsers.email, email))
      .limit(1);

    if (existing) {
      return badRequest(ErrorCode.INVALID_REGISTRATION_DATA, 'Invalid registration data');
    }

    await db.insert(authUsers).values({
      email,
      passwordHash,
      displayName: displayName || null,
    });

    const token = await signToken(email);

    const res = NextResponse.json({ success: true });
    res.cookies.set(COOKIE_NAME, token, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      sameSite: 'lax',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });

    return res;
  } catch (err) {
    console.error('[auth/register]', err);
    return serverError();
  }
}
