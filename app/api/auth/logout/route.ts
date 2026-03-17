import { NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/jwt';

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(COOKIE_NAME, '', { path: '/', maxAge: 0 });
  // Also clear legacy cookie
  res.cookies.set('tt_user_id', '', { path: '/', maxAge: 0 });
  return res;
}
