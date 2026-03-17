'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Compass, MessageSquare, User, Zap, Dumbbell, Users, LayoutDashboard, Trophy, UserPlus, Newspaper, Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLang, type TKey } from '@/lib/lang';
import { LangToggle } from '@/components/lang-toggle';
import { ThemeToggle } from '@/components/theme-toggle';

const navItems: { href: string; key: TKey; icon: React.ElementType }[] = [
  { href: '/dashboard',   key: 'nav_dashboard',   icon: LayoutDashboard },
  { href: '/discover',    key: 'nav_discover',     icon: Compass },
  { href: '/sessions',    key: 'nav_sessions',     icon: Dumbbell },
  { href: '/messages',    key: 'nav_messages',     icon: MessageSquare },
  { href: '/forum',       key: 'nav_forum',        icon: Users },
  { href: '/friends',     key: 'nav_friends',      icon: UserPlus },
  { href: '/feed',        key: 'nav_feed',         icon: Newspaper },
  { href: '/leaderboard', key: 'nav_leaderboard',  icon: Trophy },
  { href: '/profile',     key: 'nav_profile',      icon: User },
];

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useLang();

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <aside
      className="hidden md:flex flex-col w-60 shrink-0"
      style={{
        background: 'var(--bg-card)',
        borderRight: '1px solid var(--border)',
        height: '100vh',
        position: 'sticky',
        top: 0,
      }}
    >
      {/* Logo */}
      <div className="p-5 pb-4">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 flex items-center justify-center rounded-[12px]"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)' }}
          >
            <Zap className="w-5 h-5 text-white" fill="white" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight" style={{ color: 'var(--text)' }}>
              Training<span style={{ color: '#7C3AED' }}>Tinder</span>
            </span>
          </div>
        </Link>
      </div>

      {/* New session CTA */}
      <div className="px-4 pb-4">
        <Link
          href="/sessions/new"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-[14px] text-white text-sm font-semibold transition-all hover:shadow-[0_4px_20px_rgba(124,58,237,0.4)]"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)' }}
        >
          <Plus className="w-4 h-4" />
          {t('nav_new_session')}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-sm font-medium transition-all duration-150 mb-0.5',
                active
                  ? 'text-[#7C3AED] bg-[rgba(124,58,237,0.1)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-elevated)]'
              )}
            >
              <Icon className="w-4.5 h-4.5 shrink-0" />
              <span className="font-medium">{t(item.key)}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom: lang + theme */}
      <div
        className="p-4 flex items-center justify-center gap-2"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <LangToggle />
        <ThemeToggle />
      </div>
    </aside>
  );
}
