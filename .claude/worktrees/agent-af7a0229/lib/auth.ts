'use client';

import { useState, useEffect } from 'react';

export type SafeUser = {
  id: string;
  username: string | null;
  imageUrl: string;
  isLoaded: boolean;
};

function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split(';').find((c) => c.trim().startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=').slice(1).join('=').trim()) : null;
}

export function useSafeUser(): SafeUser & { isSignedIn: boolean } {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const id = getCookieValue('tt_user_id');
    setUserId(id);
    setIsLoaded(true);
  }, []);

  if (!isLoaded) {
    return { id: '', username: null, imageUrl: '', isLoaded: false, isSignedIn: false };
  }

  if (!userId) {
    return { id: '', username: null, imageUrl: '', isLoaded: true, isSignedIn: false };
  }

  // Derive username from email (part before @)
  const username = userId.split('@')[0] ?? userId;

  return {
    id: userId,
    username,
    imageUrl: '',
    isLoaded: true,
    isSignedIn: true,
  };
}

// Keep for backward compat
export const CLERK_CONFIGURED = false;
