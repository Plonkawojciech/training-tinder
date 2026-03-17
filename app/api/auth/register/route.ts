import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { signToken, COOKIE_NAME } from '@/lib/jwt';
import { db } from '@/lib/db';
import { authUsers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  // Rate limit: 5 registrations per IP per hour
  const ip = getClientIp(request);
  if (isRateLimited(`register:${ip}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Zbyt wiele rejestracji. Spróbuj ponownie za godzinę.' }, { status: 429 });
  }

  try {
    const body = await request.json() as { email?: unknown; password?: unknown; displayName?: unknown };

    if (typeof body.email !== 'string' || typeof body.password !== 'string') {
      return NextResponse.json({ error: 'Podaj email i hasło' }, { status: 400 });
    }

    const email = body.email.trim().toLowerCase();
    const password = body.password;
    const displayName = typeof body.displayName === 'string' ? body.displayName.trim().slice(0, 60) : null;

    if (!email || !password) {
      return NextResponse.json({ error: 'Podaj email i hasło' }, { status: 400 });
    }
    if (email.length > 254 || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Nieprawidłowy adres email' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Hasło musi mieć min. 8 znaków' }, { status: 400 });
    }
    if (password.length > 1024) {
      return NextResponse.json({ error: 'Hasło jest za długie' }, { status: 400 });
    }

    const [existing] = await db
      .select({ id: authUsers.id })
      .from(authUsers)
      .where(eq(authUsers.email, email))
      .limit(1);

    if (existing) {
      return NextResponse.json({ error: 'Konto z tym emailem już istnieje' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

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
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
