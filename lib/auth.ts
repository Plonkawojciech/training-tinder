'use client';

import { useState, useEffect } from 'react';

export type SafeUser = {
  id: string;
  username: string | null;
  imageUrl: string;
  isLoaded: boolean;
};

export function useSafeUser(): SafeUser & { isSignedIn: boolean } {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [userId, setUserId] = useState('');
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d: { userId?: string; displayName?: string | null }) => {
        if (d.userId) {
          setIsSignedIn(true);
          setUserId(d.userId);
          setDisplayName(d.displayName ?? null);
        } else {
          setIsSignedIn(false);
        }
      })
      .catch(() => setIsSignedIn(false))
      .finally(() => setIsLoaded(true));
  }, []);

  if (!isLoaded) {
    return { id: '', username: null, imageUrl: '', isLoaded: false, isSignedIn: false };
  }

  return {
    id: isSignedIn ? userId : '',
    username: isSignedIn ? (displayName ?? userId) : null,
    imageUrl: '',
    isLoaded: true,
    isSignedIn,
  };
}
