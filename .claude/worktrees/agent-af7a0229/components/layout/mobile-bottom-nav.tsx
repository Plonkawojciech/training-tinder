'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Compass, Dumbbell, MessageSquare, User, LayoutDashboard,
  UserPlus, Newspaper, Trophy, Users, X, Plus, MoreHorizontal,
} from 'lucide-react';
import { useLang, type TKey } from '@/lib/lang';
import { useState } from 'react';
import { LangToggle } from '@/components/lang-toggle';
import { ThemeToggle } from '@/components/theme-toggle';

const MAIN_ITEMS: { href: string; key: TKey; icon: React.ElementType }[] = [
  { href: '/discover',  key: 'mob_discover',  icon: Compass },
  { href: '/sessions',  key: 'mob_sessions',  icon: Dumbbell },
  { href: '/messages',  key: 'mob_chat',      icon: MessageSquare },
  { href: '/profile',   key: 'mob_profile',   icon: User },
];

const MORE_ITEMS: { href: string; label: string; labelPl: string; icon: React.ElementType }[] = [
  { href: '/dashboard',   label: 'Dashboard',   labelPl: 'Pulpit',      icon: LayoutDashboard },
  { href: '/friends',     label: 'Friends',     labelPl: 'Znajomi',     icon: UserPlus },
  { href: '/feed',        label: 'Feed',        labelPl: 'Aktywności',  icon: Newspaper },
  { href: '/forum',       label: 'Forum',       labelPl: 'Forum',       icon: Users },
  { href: '/leaderboard', label: 'Leaderboard', labelPl: 'Ranking',     icon: Trophy },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { t, lang } = useLang();
  const [moreOpen, setMoreOpen] = useState(false);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/');
  }

  const isMoreActive = MORE_ITEMS.some((item) => isActive(item.href));

  return (
    <>
      {/* Overlay */}
      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* More drawer — bottom sheet */}
      <div
        className="md:hidden fixed left-0 right-0 z-50 transition-all duration-300 ease-out"
        style={{
          bottom: moreOpen ? '72px' : '-120%',
        }}
      >
        <div style={{
          background: 'var(--bg-card)',
          borderTop: '1px solid var(--border)',
          borderRadius: '28px 28px 0 0',
          padding: '8px 20px 20px',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.3)',
        }}>
          {/* Pull handle */}
          <div style={{
            width: 40, height: 4,
            background: 'var(--border)',
            borderRadius: 99,
            margin: '12px auto 20px',
          }} />

          {/* Settings row */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <LangToggle />
            <ThemeToggle />
          </div>

          {/* New Session CTA */}
          <Link
            href="/sessions/new"
            onClick={() => setMoreOpen(false)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '15px', borderRadius: 16, marginBottom: 16,
              background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)',
              textDecoration: 'none', color: 'white', fontWeight: 700, fontSize: 15,
              boxShadow: '0 4px 20px rgba(124,58,237,0.35)',
            }}
          >
            <Plus style={{ width: 20, height: 20 }} />
            {lang === 'pl' ? 'Nowa Sesja' : 'New Session'}
          </Link>

          {/* Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {MORE_ITEMS.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 6, padding: '16px 8px', borderRadius: 16,
                    textDecoration: 'none',
                    background: active ? 'rgba(124,58,237,0.1)' : 'var(--bg-elevated)',
                    color: active ? '#7C3AED' : 'var(--text-muted)',
                    transition: 'all 0.15s',
                  }}
                >
                  <Icon style={{ width: 22, height: 22 }} />
                  <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.01em' }}>
                    {lang === 'pl' ? item.labelPl : item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom nav bar — frosted glass, Revolut style */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center"
        style={{
          height: 72,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          paddingLeft: 8,
          paddingRight: 8,
          background: 'var(--bg-card)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid var(--border)',
          boxShadow: '0 -1px 0 var(--border)',
        }}
      >
        {MAIN_ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                padding: '8px 4px',
                textDecoration: 'none',
                color: active ? '#7C3AED' : 'var(--text-muted)',
                transition: 'color 0.15s',
                position: 'relative',
              }}
            >
              <div style={{
                width: 48, height: 32,
                borderRadius: 99,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: active ? 'rgba(124,58,237,0.12)' : 'transparent',
                transition: 'background 0.15s',
              }}>
                <Icon style={{ width: 22, height: 22 }} />
              </div>
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, letterSpacing: '0.01em' }}>
                {t(item.key)}
              </span>
            </Link>
          );
        })}

        {/* More button */}
        <button
          onClick={() => setMoreOpen((v) => !v)}
          style={{
            flex: 1,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 4, padding: '8px 4px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: (moreOpen || isMoreActive) ? '#7C3AED' : 'var(--text-muted)',
            transition: 'color 0.15s',
          }}
        >
          <div style={{
            width: 48, height: 32, borderRadius: 99,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: (moreOpen || isMoreActive) ? 'rgba(124,58,237,0.12)' : 'transparent',
            transition: 'background 0.15s',
          }}>
            {moreOpen
              ? <X style={{ width: 22, height: 22 }} />
              : <MoreHorizontal style={{ width: 22, height: 22 }} />}
          </div>
          <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.01em' }}>
            {lang === 'pl' ? 'Więcej' : 'More'}
          </span>
        </button>
      </nav>
    </>
  );
}
