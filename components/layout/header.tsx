'use client';

import { Search, Menu, User } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { NotificationBell } from '@/components/notifications/notification-bell';
import dynamic from 'next/dynamic';

const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
const CLERK_CONFIGURED = Boolean(CLERK_KEY && CLERK_KEY.startsWith('pk_') && CLERK_KEY !== 'pk_test_placeholder');

// Only dynamically import UserButton when Clerk is configured
const UserButton = CLERK_CONFIGURED
  ? dynamic(() => import('@clerk/nextjs').then((m) => ({
      default: () => <m.UserButton appearance={{ elements: { avatarBox: 'w-8 h-8' } }} />,
    })), { ssr: false })
  : null;

function UserAvatar() {
  if (!UserButton) {
    return (
      <div className="w-8 h-8 rounded-full bg-[#1a1a1a] border border-[#2A2A2A] flex items-center justify-center">
        <User className="w-4 h-4 text-[#888888]" />
      </div>
    );
  }
  return <UserButton />;
}

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const [query, setQuery] = useState('');
  const router = useRouter();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/discover?q=${encodeURIComponent(query.trim())}`);
    }
  }

  return (
    <header className="h-14 border-b border-[#2A2A2A] bg-[#0A0A0A] flex items-center gap-4 px-4 md:px-6 shrink-0">
      {/* Mobile menu trigger */}
      <button className="md:hidden text-[#888888] hover:text-white">
        <Menu className="w-5 h-5" />
      </button>

      {title && (
        <h1 className="font-display text-lg text-white tracking-wider hidden md:block">{title}</h1>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444444]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search athletes..."
            className="w-full bg-[#111111] border border-[#2A2A2A] text-white pl-9 pr-4 py-2 text-sm placeholder:text-[#444444] focus:border-[#FF4500] focus:outline-none transition-colors"
          />
        </div>
      </form>

      <div className="flex items-center gap-3 ml-auto">
        <NotificationBell />
        <UserAvatar />
      </div>
    </header>
  );
}
