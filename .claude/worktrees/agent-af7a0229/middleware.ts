import { NextRequest, NextResponse } from 'next/server';

const PROTECTED = [
  '/dashboard', '/profile', '/messages', '/sessions', '/calendar',
  '/discover', '/leaderboard', '/onboarding', '/gym', '/feed', '/stats', '/forum',
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip API routes and static files
  if (pathname.startsWith('/api') || pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const userId = req.cookies.get('tt_user_id')?.value;
  if (!userId) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
};
