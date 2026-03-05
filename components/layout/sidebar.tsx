'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Compass,
  Calendar,
  MessageSquare,
  Trophy,
  User,
  Zap,
  Dumbbell,
  BarChart2,
  Rss,
  ClipboardList,
  Radio,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/discover', label: 'Discover', icon: Compass },
  { href: '/sessions', label: 'Sessions', icon: Dumbbell },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/profile', label: 'Profile', icon: User },
];

const gymNavItems = [
  { href: '/gym', label: 'Gym Hub', icon: Dumbbell },
  { href: '/gym/live', label: 'Live', icon: Radio, live: true },
  { href: '/gym/finder', label: 'Gym Finder', icon: MapPin },
  { href: '/stats', label: 'My Stats', icon: BarChart2 },
  { href: '/feed', label: 'Feed', icon: Rss },
  { href: '/gym/plans', label: 'Plans', icon: ClipboardList },
];

export function Sidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/gym' && pathname.startsWith('/gym/') && !pathname.startsWith('/gym/plans') && !pathname.startsWith('/gym/live') && !pathname.startsWith('/gym/finder')) {
      return true;
    }
    if (href === '/gym/plans' && pathname.startsWith('/gym/plans')) {
      return true;
    }
    if (href === '/gym/live' && pathname.startsWith('/gym/live')) {
      return true;
    }
    if (href === '/gym/finder' && pathname.startsWith('/gym/finder')) {
      return true;
    }
    return pathname === href || (href !== '/gym' && !href.startsWith('/gym/') && pathname.startsWith(href + '/'));
  }

  return (
    <aside
      className="hidden md:flex flex-col w-60 shrink-0 border-r border-[#2A2A2A] bg-[#0A0A0A]"
      style={{ height: '100vh', position: 'sticky', top: 0 }}
    >
      {/* Logo */}
      <div className="p-6 border-b border-[#2A2A2A]">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div
            className="w-8 h-8 bg-[#FF4500] flex items-center justify-center"
            style={{ clipPath: 'polygon(0 0, 100% 0, 100% 70%, 70% 100%, 0 100%)' }}
          >
            <Zap className="w-4 h-4 text-white" fill="white" />
          </div>
          <span className="font-display text-xl text-white tracking-wider">
            TRAINING<span className="text-[#FF4500]">TINDER</span>
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {/* Main nav */}
        <div className="mb-4">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all duration-150 border-l-2',
                  active
                    ? 'text-[#FF4500] bg-[rgba(255,69,0,0.08)] border-[#FF4500]'
                    : 'text-[#888888] border-transparent hover:text-white hover:bg-[#111111] hover:border-[#2A2A2A]'
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="uppercase tracking-wider text-xs">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Gym section */}
        <div className="border-t border-[#1A1A1A] pt-4">
          <div className="px-6 mb-2">
            <span className="text-[10px] font-bold text-[#444444] uppercase tracking-widest">Gym</span>
          </div>
          {gymNavItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all duration-150 border-l-2',
                  active
                    ? 'text-[#FF4500] bg-[rgba(255,69,0,0.08)] border-[#FF4500]'
                    : 'text-[#888888] border-transparent hover:text-white hover:bg-[#111111] hover:border-[#2A2A2A]'
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="uppercase tracking-wider text-xs flex-1">{item.label}</span>
                {'live' in item && item.live && (
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t border-[#2A2A2A] flex flex-col gap-2">
        <Link
          href="/gym/log"
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#FF4500] text-white text-xs font-semibold uppercase tracking-wider hover:shadow-[0_0_20px_rgba(255,69,0,0.4)] transition-all"
        >
          <Dumbbell className="w-4 h-4" />
          Log Workout
        </Link>
        <Link
          href="/sessions/new"
          className="flex items-center justify-center gap-2 w-full py-2.5 border border-[#2A2A2A] text-[#888888] text-xs font-semibold uppercase tracking-wider hover:border-[#FF4500] hover:text-white transition-all"
        >
          New Session
        </Link>
      </div>
    </aside>
  );
}
