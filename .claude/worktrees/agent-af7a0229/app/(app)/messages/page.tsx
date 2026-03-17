'use client';

export const dynamic = 'force-dynamic';

import nextDynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { useSafeUser } from '@/lib/auth';
import { MessageSquare, Search, ChevronRight } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { ChatWindow } from '@/components/messages/chat-window';
import { useLang } from '@/lib/lang';

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
  const { lang } = useLang();
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

  const emptyLabel = lang === 'pl'
    ? 'Brak rozmów. Swipuj i znajdź kogoś!'
    : 'No conversations yet. Go swipe!';
  const searchPlaceholder = lang === 'pl' ? 'Szukaj...' : 'Search...';
  const title = lang === 'pl' ? 'Wiadomości' : 'Messages';
  const selectLabel = lang === 'pl' ? 'Wybierz rozmowę' : 'Select a conversation';
  const selectSub = lang === 'pl'
    ? 'Kliknij kontakt po lewej, żeby napisać'
    : 'Choose an athlete from the list to start chatting';

  // ─── Conversation list panel ─────────────────────────────────────────
  const ConversationList = (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%',
      background: '#080808',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 16px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(10,10,10,0.97)',
        backdropFilter: 'blur(20px)',
        flexShrink: 0,
      }}>
        <div style={{ fontWeight: 800, fontSize: 22, color: 'white', marginBottom: 12 }}>
          {title}
        </div>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            width: 15, height: 15, color: '#444',
          }} />
          <input
            type="text"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder={searchPlaceholder}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 20, padding: '9px 12px 9px 36px',
              color: 'white', fontSize: 14, outline: 'none',
            }}
          />
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: '8px 0' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px',
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.05)',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{
                    height: 14, width: '60%', borderRadius: 14,
                    background: 'rgba(255,255,255,0.05)',
                    marginBottom: 6,
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }} />
                  <div style={{
                    height: 11, width: '40%', borderRadius: 14,
                    background: 'rgba(255,255,255,0.03)',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }} />
                </div>
              </div>
            ))}
            <style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:.8}}`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '60px 20px', gap: 12,
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(255,255,255,0.04)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <MessageSquare style={{ width: 28, height: 28, color: '#333' }} />
            </div>
            <p style={{ color: '#444', fontSize: 13, textAlign: 'center', lineHeight: 1.5 }}>
              {emptyLabel}
            </p>
          </div>
        ) : (
          filtered.map((partner) => {
            const isActive = selected?.clerkId === partner.clerkId;
            return (
              <button
                key={partner.clerkId}
                onClick={() => setSelected(partner)}
                style={{
                  width: '100%', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px',
                  background: isActive ? 'rgba(124,58,237,0.08)' : 'transparent',
                  border: 'none',
                  borderLeft: `3px solid ${isActive ? '#7C3AED' : 'transparent'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <Avatar src={partner.avatarUrl} fallback={partner.username ?? '?'} size="md" />
                  <span style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: 10, height: 10, borderRadius: '50%',
                    background: '#333', border: '2px solid #080808',
                  }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    color: 'white', fontWeight: 600, fontSize: 14,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {partner.username ?? 'Athlete'}
                  </div>
                  <div style={{
                    color: '#555', fontSize: 12,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    marginTop: 2,
                  }}>
                    {partner.lastMessage ?? (lang === 'pl' ? 'Dotknij, żeby napisać' : 'Tap to message')}
                  </div>
                </div>
                <ChevronRight style={{ width: 15, height: 15, color: '#333', flexShrink: 0 }} />
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  // ─── Chat area placeholder (desktop) ────────────────────────────────
  const EmptyChat = (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#080808', gap: 16,
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: 'rgba(124,58,237,0.07)',
        border: '2px solid rgba(124,58,237,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <MessageSquare style={{ width: 34, height: 34, color: '#7C3AED' }} />
      </div>
      <div>
        <div style={{ color: 'white', fontWeight: 700, fontSize: 16, textAlign: 'center', marginBottom: 6 }}>
          {selectLabel}
        </div>
        <div style={{ color: '#444', fontSize: 13, textAlign: 'center' }}>{selectSub}</div>
      </div>
    </div>
  );

  return (
    <>
      {/* ─── MOBILE ─── */}
      <div className="md:hidden" style={{ height: 'calc(100dvh - 64px)', position: 'relative', overflow: 'hidden' }}>
        {/* Contact list — always rendered, hidden when chat open */}
        <div style={{
          position: 'absolute', inset: 0,
          transform: selected ? 'translateX(-100%)' : 'translateX(0)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
        }}>
          {ConversationList}
        </div>

        {/* Chat view — slides in from right */}
        <div style={{
          position: 'absolute', inset: 0,
          transform: selected ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
          pointerEvents: selected ? 'auto' : 'none',
        }}>
          {selected && (
            <ChatWindow
              currentUserId={user.id || ''}
              partnerId={selected.clerkId}
              partnerName={selected.username}
              partnerAvatar={selected.avatarUrl}
              onBack={() => setSelected(null)}
            />
          )}
        </div>
      </div>

      {/* ─── DESKTOP ─── */}
      <div className="hidden md:flex" style={{ height: '100%' }}>
        {/* Sidebar list */}
        <div style={{
          width: 280, flexShrink: 0,
          borderRight: '1px solid rgba(255,255,255,0.07)',
          height: '100%',
        }}>
          {ConversationList}
        </div>

        {/* Chat or empty */}
        <div style={{ flex: 1, minWidth: 0, height: '100%' }}>
          {selected ? (
            <ChatWindow
              currentUserId={user.id || ''}
              partnerId={selected.clerkId}
              partnerName={selected.username}
              partnerAvatar={selected.avatarUrl}
            />
          ) : (
            EmptyChat
          )}
        </div>
      </div>
    </>
  );
}

export default nextDynamic(() => Promise.resolve({ default: MessagesPageInner }), { ssr: false });
