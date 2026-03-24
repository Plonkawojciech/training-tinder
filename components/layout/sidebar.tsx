'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Compass, MessageSquare, User, Zap, Dumbbell, Users, LayoutDashboard, Trophy, UserPlus,
  Newspaper, Plus, Settings, BarChart2, Activity, TrendingUp, ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLang, type TKey } from '@/lib/lang';
import { LangToggle } from '@/components/lang-toggle';
import { ThemeToggle } from '@/components/theme-toggle';

const navItems: { href: string; key: TKey; icon: React.ElementType }[] = [
  { href: '/dashboard',   key: 'nav_dashboard',   icon: LayoutDashboard },
  { href: '/discover',    key: 'nav_discover',     icon: Compass },
  { href: '/sessions',    key: 'nav_sessions',     icon: Dumbbell },
  { href: '/gym',         key: 'nav_gym',          icon: Activity },
  { href: '/training',    key: 'nav_training',     icon: TrendingUp },
  { href: '/messages',    key: 'nav_messages',     icon: MessageSquare },
  { href: '/forum',       key: 'nav_forum',        icon: Users },
  { href: '/friends',     key: 'nav_friends',      icon: UserPlus },
  { href: '/feed',        key: 'nav_feed',         icon: Newspaper },
  { href: '/stats',       key: 'nav_stats',        icon: BarChart2 },
  { href: '/leaderboard', key: 'nav_leaderboard',  icon: Trophy },
  { href: '/profile',     key: 'nav_profile',      icon: User },
  { href: '/settings',    key: 'nav_settings',     icon: Settings },
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
        <Link href="/" className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 flex items-center justify-center rounded-[12px]"
            style={{ background: 'linear-gradient(135deg, #6366F1, #818CF8)' }}
          >
            <Zap className="w-5 h-5 text-white" fill="white" />
          </div>
          <div>
            <span style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em', color: 'var(--text)' }}>
              Athlix <span style={{ color: 'var(--accent)' }}>TrainMate</span>
            </span>
          </div>
        </Link>
      </div>

      {/* New session CTA */}
      <div className="px-4 pb-4">
        <Link
          href="/sessions/new"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-[14px] text-white text-sm font-semibold transition-all hover:shadow-[0_4px_20px_rgba(99,102,241,0.4)]"
          style={{ background: 'linear-gradient(135deg, #6366F1, #818CF8)' }}
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
                  ? 'text-[#6366F1] bg-[rgba(99,102,241,0.1)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-elevated)]'
              )}
            >
              <Icon className="w-4.5 h-4.5 shrink-0" />
              <span className="font-medium">{t(item.key)}</span>
            </Link>
          );
        })}
      </nav>

      {/* TrainPilot link */}
      <div className="px-3 pb-2" style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        <a
          href="https://trainpilot.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-sm font-medium transition-all text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-elevated)]"
        >
          <Zap className="w-4 h-4 shrink-0 text-[#6366F1]" />
          <span className="font-medium">TrainPilot</span>
          <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
        </a>
        <a
          href="https://athlix-health.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-sm font-medium transition-all text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-elevated)]"
        >
          <Activity className="w-4 h-4 shrink-0 text-[#00E676]" />
          <span className="font-medium">Athlix Health</span>
          <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
        </a>
      </div>

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
