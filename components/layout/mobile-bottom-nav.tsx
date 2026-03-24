'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Compass, Dumbbell, MessageSquare, User,
  UserPlus, Newspaper, Trophy, Users, X, Plus, MoreHorizontal, Settings,
  Activity, BarChart2, TrendingUp, Calendar, Zap,
} from 'lucide-react';
import { useLang, type TKey } from '@/lib/lang';
import { useState, useEffect, useCallback } from 'react';
import { LangToggle } from '@/components/lang-toggle';
import { ThemeToggle } from '@/components/theme-toggle';

const MAIN_ITEMS: { href: string; key: TKey; icon: React.ElementType }[] = [
  { href: '/discover',    key: 'mob_discover',    icon: Compass },
  { href: '/sessions',    key: 'mob_sessions',    icon: Dumbbell },
  { href: '/messages',    key: 'mob_chat',        icon: MessageSquare },
  { href: '/leaderboard', key: 'nav_leaderboard', icon: Trophy },
];

const MORE_ITEMS: { href: string; key: TKey; icon: React.ElementType }[] = [
  { href: '/profile',   key: 'mob_profile',   icon: User },
  { href: '/friends',   key: 'mob_friends',   icon: UserPlus },
  { href: '/feed',      key: 'mob_feed',      icon: Newspaper },
  { href: '/forum',     key: 'mob_forum',     icon: Users },
  { href: '/gym',       key: 'mob_gym',       icon: Activity },
  { href: '/training',  key: 'mob_training',  icon: TrendingUp },
  { href: '/stats',     key: 'mob_stats',     icon: BarChart2 },
  { href: '/calendar',  key: 'mob_calendar',  icon: Calendar },
  { href: '/settings',  key: 'mob_settings',  icon: Settings },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { t, lang } = useLang();
  const [moreOpen, setMoreOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(() => {
    fetch('/api/messages/unread-count')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.unreadCount === 'number') {
          setUnreadCount(data.unreadCount);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30_000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

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
          bottom: moreOpen ? 'calc(60px + env(safe-area-inset-bottom, 0px))' : '-120%',
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
            aria-label={lang === 'pl' ? 'Nowa Sesja' : 'New Session'}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '15px', borderRadius: 16, marginBottom: 16,
              background: 'linear-gradient(135deg, #F97316 0%, #FB923C 100%)',
              textDecoration: 'none', color: 'white', fontWeight: 700, fontSize: 15,
              boxShadow: '0 4px 20px rgba(249,115,22,0.35)',
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
                    background: active ? 'rgba(249,115,22,0.1)' : 'var(--bg-elevated)',
                    color: active ? '#F97316' : 'var(--text-muted)',
                    transition: 'all 0.15s',
                  }}
                >
                  <Icon style={{ width: 22, height: 22 }} />
                  <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.01em' }}>
                    {t(item.key)}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* TrainPilot external link */}
          <a
            href="https://trainpilot.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMoreOpen(false)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px', borderRadius: 14, marginTop: 10,
              background: 'rgba(249,115,22,0.08)',
              border: '1px solid rgba(249,115,22,0.2)',
              textDecoration: 'none', color: '#F97316', fontWeight: 700, fontSize: 13,
            }}
          >
            <Zap style={{ width: 16, height: 16 }} />
            TrainPilot — {t('dash_personal_analytics')} ↗
          </a>
        </div>
      </div>

      {/* Bottom nav bar — frosted glass, Revolut style */}
      <nav
        role="navigation"
        aria-label={t('nav_main_aria')}
        className="md:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{
          background: 'var(--bg-card)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid var(--border)',
          boxShadow: '0 -1px 0 var(--border)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* 72px content strip */}
        <div style={{ height: 60, display: 'flex', alignItems: 'center', paddingLeft: 8, paddingRight: 8 }}>
        {MAIN_ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={t(item.key)}
              aria-current={active ? 'page' : undefined}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                padding: '8px 4px',
                textDecoration: 'none',
                color: active ? '#F97316' : 'var(--text-muted)',
                transition: 'color 0.15s',
                position: 'relative',
              }}
            >
              <div style={{
                width: 48, height: 44,
                borderRadius: 99,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: active ? 'rgba(249,115,22,0.12)' : 'transparent',
                transition: 'background 0.15s',
                position: 'relative',
              }}>
                <Icon style={{ width: 22, height: 22 }} />
                {item.href === '/messages' && unreadCount > 0 && (
                  <span
                    aria-label={t('nav_unread_aria', { count: String(unreadCount > 99 ? '99+' : unreadCount) })}
                    style={{
                    position: 'absolute',
                    top: -4,
                    right: -2,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 99,
                    background: '#EF4444',
                    color: '#FFFFFF',
                    fontSize: 10,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                    lineHeight: 1,
                  }}>
                    <span aria-hidden="true">{unreadCount > 99 ? '99+' : unreadCount}</span>
                  </span>
                )}
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
          aria-label={t('mob_more_aria')}
          aria-expanded={moreOpen}
          style={{
            flex: 1,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 4, padding: '8px 4px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: (moreOpen || isMoreActive) ? '#F97316' : 'var(--text-muted)',
            transition: 'color 0.15s',
          }}
        >
          <div style={{
            width: 48, height: 44, borderRadius: 99,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: (moreOpen || isMoreActive) ? 'rgba(249,115,22,0.12)' : 'transparent',
            transition: 'background 0.15s',
          }}>
            {moreOpen
              ? <X style={{ width: 22, height: 22 }} />
              : <MoreHorizontal style={{ width: 22, height: 22 }} />}
          </div>
          <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.01em' }}>
            {t('mob_more')}
          </span>
        </button>
        </div>
      </nav>
    </>
  );
}
