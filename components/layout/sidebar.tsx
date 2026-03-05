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

export function Sidebar() {
  const pathname = usePathname();

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
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all duration-150 border-l-2',
                isActive
                  ? 'text-[#FF4500] bg-[rgba(255,69,0,0.08)] border-[#FF4500]'
                  : 'text-[#888888] border-transparent hover:text-white hover:bg-[#111111] hover:border-[#2A2A2A]'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="uppercase tracking-wider text-xs">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t border-[#2A2A2A]">
        <Link
          href="/sessions/new"
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#FF4500] text-white text-xs font-semibold uppercase tracking-wider hover:shadow-[0_0_20px_rgba(255,69,0,0.4)] transition-all"
        >
          <Dumbbell className="w-4 h-4" />
          New Session
        </Link>
      </div>
    </aside>
  );
}
