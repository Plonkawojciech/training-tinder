import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { signToken, COOKIE_NAME } from '@/lib/jwt';
import { db } from '@/lib/db';
import { authUsers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  // Rate limit: 10 attempts per IP per 15 min
  const ip = getClientIp(request);
  if (isRateLimited(`login:${ip}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json({ error: 'Zbyt wiele prób. Spróbuj ponownie za 15 minut.' }, { status: 429 });
  }

  try {
    const body = await request.json() as { email?: unknown; password?: unknown };

    if (typeof body.email !== 'string' || typeof body.password !== 'string') {
      return NextResponse.json({ error: 'Podaj email i hasło' }, { status: 400 });
    }

    const email = body.email.trim().toLowerCase();
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json({ error: 'Podaj email i hasło' }, { status: 400 });
    }

    // Enforce reasonable lengths to prevent DoS
    if (email.length > 254 || password.length > 1024) {
      return NextResponse.json({ error: 'Nieprawidłowe dane' }, { status: 400 });
    }

    const [user] = await db
      .select()
      .from(authUsers)
      .where(eq(authUsers.email, email))
      .limit(1);

    // Always run bcrypt to prevent timing-based user enumeration
    const hash = user?.passwordHash ?? '$2b$12$invalidhashpadding000000000000000000000000000000000000';
    const valid = await bcrypt.compare(password, hash);

    if (!user || !valid) {
      return NextResponse.json({ error: 'Nieprawidłowy email lub hasło' }, { status: 401 });
    }

    const token = await signToken(user.email);

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
    console.error('[auth/login]', err);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
