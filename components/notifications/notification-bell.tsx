'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, X, Users, Calendar, MessageSquare } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

interface NotificationItem {
  id: number;
  type: string;
  dataJson: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function fetchNotifications() {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const data: NotificationItem[] = await res.json();
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.read).length);
    } catch {
      // ignore
    }
  }

  async function markAllRead() {
    try {
      await fetch('/api/notifications', { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  }

  function getIcon(type: string) {
    switch (type) {
      case 'match': return <Users className="w-4 h-4 text-[#6366F1]" />;
      case 'session_invite': return <Calendar className="w-4 h-4 text-[#FFD700]" />;
      case 'message': return <MessageSquare className="w-4 h-4 text-[#00D4FF]" />;
      default: return <Bell className="w-4 h-4 text-[#888888]" />;
    }
  }

  function getLabel(n: NotificationItem): string {
    const data = n.dataJson as Record<string, string> | null;
    switch (n.type) {
      case 'match': return `Nowe dopasowanie z ${data?.username ?? 'sportowcem'}`;
      case 'session_invite': return `Zaproszenie na sesję: ${data?.title ?? 'Trening'}`;
      case 'message': return `Wiadomość od ${data?.username ?? 'kogoś'}`;
      default: return 'Nowe powiadomienie';
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 text-[#888888] hover:text-white transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#6366F1] text-white text-[10px] font-bold flex items-center justify-center rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-[var(--bg-card)] border border-[var(--border)] shadow-2xl z-50 animate-fade-in">
          <div className="flex items-center justify-between p-3 border-b border-[var(--border)]">
            <h3 className="font-display text-sm text-white tracking-wider">POWIADOMIENIA</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  aria-label="Oznacz wszystkie jako przeczytane"
                  className="text-[10px] text-[#888888] hover:text-[#6366F1] flex items-center gap-1 uppercase tracking-wider"
                >
                  <Check className="w-3 h-3" />
                  Oznacz przeczytane
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                aria-label="Zamknij powiadomienia"
                className="text-[#888888] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-[#888888] text-sm">
                Brak powiadomień
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 p-3 border-b border-[var(--border)] transition-colors hover:bg-[#161616] ${
                    !n.read ? 'bg-[rgba(99,102,241,0.05)]' : ''
                  }`}
                >
                  <div className="mt-0.5">{getIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white leading-snug">{getLabel(n)}</p>
                    <p className="text-[10px] text-[#888888] mt-0.5">
                      {formatRelativeTime(n.createdAt)}
                    </p>
                  </div>
                  {!n.read && (
                    <div className="w-1.5 h-1.5 bg-[#6366F1] rounded-full mt-1.5 shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
