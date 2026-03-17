'use client';
import { useEffect } from 'react';

export function PushRegistrar() {
  useEffect(() => {
    async function register() {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
      if (localStorage.getItem('push-registered')) return;

      try {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') return;

        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        });

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub }),
        });

        localStorage.setItem('push-registered', '1');
      } catch {}
    }

    // Delay to not interrupt onboarding
    const timer = setTimeout(register, 5000);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
