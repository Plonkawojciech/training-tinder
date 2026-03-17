import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getAuthUserId } from '@/lib/server-auth';
import { signToken, COOKIE_NAME } from '@/lib/jwt';
import { db } from '@/lib/db';
import { authUsers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  // Rate limit: 5 attempts per IP per 15 minutes
  const ip = getClientIp(request);
  if (isRateLimited(`change-password:${ip}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json({ error: 'Zbyt wiele prób. Spróbuj ponownie za 15 minut.' }, { status: 429 });
  }

  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

  try {
    const { currentPassword, newPassword } = await request.json() as {
      currentPassword: string;
      newPassword: string;
    };

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Wypełnij wszystkie pola' }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Nowe hasło musi mieć co najmniej 8 znaków' }, { status: 400 });
    }

    const [row] = await db
      .select({ passwordHash: authUsers.passwordHash })
      .from(authUsers)
      .where(eq(authUsers.email, userId))
      .limit(1);

    if (!row?.passwordHash) {
      return NextResponse.json({ error: 'Użytkownik nie istnieje' }, { status: 404 });
    }

    const valid = await bcrypt.compare(currentPassword, row.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Nieprawidłowe aktualne hasło' }, { status: 400 });
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
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
