'use client';

// Safe auth abstraction - works with or without Clerk
const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
export const CLERK_CONFIGURED = Boolean(
  CLERK_KEY && CLERK_KEY.startsWith('pk_') && CLERK_KEY !== 'pk_test_placeholder'
);

export type SafeUser = {
  id: string;
  username: string | null;
  imageUrl: string;
  isLoaded: boolean;
};

const DEMO_USER: SafeUser = {
  id: 'demo_user',
  username: 'demo',
  imageUrl: '',
  isLoaded: true,
};

// Safe hook that returns demo user when Clerk is not configured
export function useSafeUser(): SafeUser & { isSignedIn: boolean } {
  if (!CLERK_CONFIGURED) {
    return { ...DEMO_USER, isSignedIn: false };
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useUser } = require('@clerk/nextjs');
    const { user, isLoaded } = useUser();
    if (!isLoaded) return { id: '', username: null, imageUrl: '', isLoaded: false, isSignedIn: false };
    return {
      id: user?.id || '',
      username: user?.username || null,
      imageUrl: user?.imageUrl || '',
      isLoaded: true,
      isSignedIn: !!user,
    };
  } catch {
    return { ...DEMO_USER, isSignedIn: false };
  }
}
