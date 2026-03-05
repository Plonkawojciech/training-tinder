import { NextRequest, NextResponse } from 'next/server';

const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
const CLERK_CONFIGURED = CLERK_KEY && CLERK_KEY.startsWith('pk_') && CLERK_KEY !== 'pk_test_placeholder';

const isProtectedPath = (pathname: string) => {
  const protected_paths = ['/dashboard', '/profile', '/messages', '/sessions', '/calendar', '/discover', '/leaderboard', '/onboarding'];
  return protected_paths.some(p => pathname.startsWith(p));
};

// Only use Clerk middleware if Clerk is properly configured
let _clerkMiddleware: ((auth: any, req: any) => Promise<void>) | null = null;

async function getClerkMiddleware() {
  if (!CLERK_CONFIGURED) return null;
  if (_clerkMiddleware) return _clerkMiddleware;
  try {
    const { clerkMiddleware, createRouteMatcher } = await import('@clerk/nextjs/server');
    const isProtected = createRouteMatcher([
      '/dashboard(.*)', '/profile(.*)', '/messages(.*)', '/sessions(.*)',
      '/calendar(.*)', '/discover(.*)', '/leaderboard(.*)', '/onboarding(.*)',
    ]);
    _clerkMiddleware = async (auth: any, req: any) => {
      if (isProtected(req)) await auth.protect();
    };
    return _clerkMiddleware;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  if (CLERK_CONFIGURED) {
    const { clerkMiddleware, createRouteMatcher } = await import('@clerk/nextjs/server');
    const isProtected = createRouteMatcher([
      '/dashboard(.*)', '/profile(.*)', '/messages(.*)', '/sessions(.*)',
      '/calendar(.*)', '/discover(.*)', '/leaderboard(.*)', '/onboarding(.*)',
    ]);
    return clerkMiddleware(async (auth, req) => {
      if (isProtected(req)) await auth.protect();
    })(req as any, {} as any);
  }

  // Clerk not configured: allow all requests through (demo mode)
  if (isProtectedPath(req.nextUrl.pathname)) {
    // Redirect to home with setup notice if not configured
    const url = req.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('setup', 'clerk');
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
};
