'use client';

import { Search, LogOut, X, Zap } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { useSafeUser } from '@/lib/auth';

export function Header({ title }: { title?: string }) {
  const [query, setQuery] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const router = useRouter();
  const user = useSafeUser();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/discover?q=${encodeURIComponent(query.trim())}`);
      setShowMobileSearch(false);
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <>
      <header
        className="h-14 flex items-center gap-3 px-4 md:px-6 shrink-0 glass"
        style={{
          borderBottom: '1px solid var(--border)',
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }}
      >
        {/* Mobile: Logo */}
        <Link href="/dashboard" className="md:hidden flex items-center gap-2 shrink-0">
          <div
            className="w-8 h-8 flex items-center justify-center rounded-[10px]"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)' }}
          >
            <Zap className="w-4 h-4 text-white" fill="white" />
          </div>
          <span className="font-bold text-base tracking-tight" style={{ color: 'var(--text)' }}>
            Training<span style={{ color: '#7C3AED' }}>Tinder</span>
          </span>
        </Link>

        {title && (
          <h1 className="hidden md:block font-bold text-lg tracking-tight" style={{ color: 'var(--text)' }}>{title}</h1>
        )}

        {/* Desktop search */}
        <form onSubmit={handleSearch} className="hidden md:block flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Szukaj sportowców..."
              className="w-full pl-9 pr-4 py-2 text-sm transition-all"
              style={{
                background: 'var(--bg-elevated)',
                border: '1.5px solid var(--border)',
                borderRadius: 12,
                color: 'var(--text)',
              }}
            />
          </div>
        </form>

        <div className="flex items-center gap-2 ml-auto">
          {/* Mobile: search icon */}
          <button
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-[10px] transition-colors"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
            onClick={() => setShowMobileSearch((v) => !v)}
            aria-label="Szukaj"
          >
            {showMobileSearch ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          </button>

          <NotificationBell />

          {user.isSignedIn && (
            <button
              onClick={handleLogout}
              title="Wyloguj"
              className="w-9 h-9 flex items-center justify-center rounded-[10px] transition-colors"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Mobile search drawer */}
      {showMobileSearch && (
        <div
          className="md:hidden px-4 py-3 shrink-0"
          style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}
        >
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Szukaj sportowców..."
                autoFocus
                className="w-full pl-9 pr-4 py-2.5 text-sm"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1.5px solid var(--border)',
                  borderRadius: 12,
                  color: 'var(--text)',
                }}
              />
            </div>
          </form>
        </div>
      )}
    </>
  );
}
