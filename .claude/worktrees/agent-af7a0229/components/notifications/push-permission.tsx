'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, Check } from 'lucide-react';

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushPermission() {
  const [permission, setPermission] = useState<PermissionState>('default');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission as PermissionState);
  }, []);

  async function handleEnable() {
    if (loading) return;
    setLoading(true);

    try {
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);

      if (result === 'granted') {
        const registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) {
          console.warn('VAPID public key not configured');
          return;
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as unknown as ArrayBuffer,
        });

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription }),
        });
      }
    } catch (err) {
      console.error('Failed to enable push notifications:', err);
    } finally {
      setLoading(false);
    }
  }

  if (permission === 'unsupported') return null;

  if (permission === 'granted') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-xs text-green-500">
        <Check className="w-3 h-3" />
        <span>Powiadomienia włączone</span>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-xs text-[#555555]">
        <BellOff className="w-3 h-3" />
        <span>Powiadomienia zablokowane</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleEnable}
      disabled={loading}
      className="flex items-center gap-2 px-3 py-2 text-xs text-[#888888] hover:text-white transition-colors disabled:opacity-50 w-full"
    >
      <Bell className="w-3 h-3" />
      <span>{loading ? 'Włączanie...' : 'Włącz powiadomienia'}</span>
    </button>
  );
}
