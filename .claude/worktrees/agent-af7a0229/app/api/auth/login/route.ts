import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email } = await request.json() as { email: string };

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Podaj poprawny adres email' }, { status: 400 });
    }

    const userId = email.trim().toLowerCase();

    const res = NextResponse.json({ success: true, userId });
    res.cookies.set('tt_user_id', userId, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return res;
  } catch {
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
