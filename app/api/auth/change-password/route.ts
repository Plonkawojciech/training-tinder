import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getAuthUserId } from '@/lib/server-auth';
import { signToken, COOKIE_NAME } from '@/lib/jwt';
import { db } from '@/lib/db';
import { authUsers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';
import { unauthorized, serverError, badRequest, rateLimited, notFound, ErrorCode } from '@/lib/api-errors';

export async function POST(request: Request) {
  // Rate limit: 5 attempts per IP per 15 minutes
  const ip = getClientIp(request);
  if (isRateLimited(`change-password:${ip}`, 5, 15 * 60 * 1000)) {
    return rateLimited('Too many attempts. Try again in 15 minutes.');
  }

  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const { currentPassword, newPassword } = await request.json() as {
      currentPassword: string;
      newPassword: string;
    };

    if (!currentPassword || !newPassword) {
      return badRequest(ErrorCode.MISSING_FIELDS, 'All fields are required');
    }
    if (newPassword.length < 8) {
      return badRequest(ErrorCode.WEAK_PASSWORD, 'New password must be at least 8 characters');
    }

    const [row] = await db
      .select({ passwordHash: authUsers.passwordHash })
      .from(authUsers)
      .where(eq(authUsers.email, userId))
      .limit(1);

    if (!row?.passwordHash) {
      return notFound('User not found');
    }

    const valid = await bcrypt.compare(currentPassword, row.passwordHash);
    if (!valid) {
      return badRequest(ErrorCode.INVALID_CURRENT_PASSWORD, 'Invalid current password');
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await db
      .update(authUsers)
      .set({ passwordHash: newHash })
      .where(eq(authUsers.email, userId));

    // Issue a fresh JWT so the user stays authenticated
    const token = await signToken(userId);
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
    console.error('[tt/auth/change-password]', err);
    return serverError();
  }
}
