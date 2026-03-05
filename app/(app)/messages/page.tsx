'use client';

export const dynamic = 'force-dynamic';

import nextDynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { useSafeUser } from '@/lib/auth';
import { MessageSquare, Search } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { ChatWindow } from '@/components/messages/chat-window';
import { formatRelativeTime } from '@/lib/utils';

interface MatchResult {
  user: {
    clerkId: string;
    username: string | null;
    avatarUrl: string | null;
    sportTypes: string[];
  };
  score: number;
}

interface ConversationPartner {
  clerkId: string;
  username: string | null;
  avatarUrl: string | null;
  lastMessage?: string;
  lastMessageTime?: string;
}

function MessagesPageInner() {
  const user = useSafeUser();
  const [partners, setPartners] = useState<ConversationPartner[]>([]);
  const [selected, setSelected] = useState<ConversationPartner | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');

  useEffect(() => {
    async function fetchMatches() {
      try {
        const res = await fetch('/api/matches?radius=500');
        if (res.ok) {
          const data: MatchResult[] = await res.json();
          const ps: ConversationPartner[] = data.map((m) => ({
            clerkId: m.user.clerkId,
            username: m.user.username,
            avatarUrl: m.user.avatarUrl,
          }));
          setPartners(ps);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchMatches();
  }, []);

  const filtered = partners.filter((p) =>
    !searchQ || p.username?.toLowerCase().includes(searchQ.toLowerCase())
  );

  if (!user.isLoaded) return null;

  return (
    <div className="flex h-full">
      {/* Partner list */}
      <div
        className="w-64 shrink-0 border-r border-[#2A2A2A] flex flex-col"
        style={{ height: 'calc(100vh - 56px)' }}
      >
        <div className="p-4 border-b border-[#2A2A2A]">
          <h2 className="font-display text-lg text-white tracking-wider mb-3">MESSAGES</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444444]" />
            <input
              type="text"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search..."
              className="w-full bg-[#0A0A0A] border border-[#2A2A2A] text-white pl-9 pr-3 py-2 text-xs focus:border-[#FF4500] focus:outline-none placeholder:text-[#444444]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 skeleton" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-center">
              <MessageSquare className="w-8 h-8 text-[#2A2A2A] mx-auto mb-2" />
              <p className="text-xs text-[#888888]">No athletes to message yet</p>
            </div>
          ) : (
            filtered.map((partner) => (
              <button
                key={partner.clerkId}
                onClick={() => setSelected(partner)}
                className="w-full flex items-center gap-3 p-4 border-b border-[#1A1A1A] hover:bg-[#111111] transition-colors text-left"
                style={
                  selected?.clerkId === partner.clerkId
                    ? { background: '#161616', borderLeft: '2px solid #FF4500' }
                    : {}
                }
              >
                <Avatar src={partner.avatarUrl} fallback={partner.username ?? '?'} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm text-white font-medium truncate">
                    {partner.username ?? 'Athlete'}
                  </p>
                  {partner.lastMessage && (
                    <p className="text-xs text-[#888888] truncate">{partner.lastMessage}</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 min-w-0">
        {selected ? (
          <ChatWindow
            currentUserId={user.id || ''}
            partnerId={selected.clerkId}
            partnerName={selected.username}
            partnerAvatar={selected.avatarUrl}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <MessageSquare className="w-16 h-16 text-[#2A2A2A]" />
            <h3 className="font-display text-xl text-[#888888]">SELECT A CONVERSATION</h3>
            <p className="text-[#888888] text-sm">
              Choose an athlete from the list to start chatting
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default nextDynamic(() => Promise.resolve({ default: MessagesPageInner }), { ssr: false });
