'use client';

export const dynamic = 'force-dynamic';

import nextDynamic from 'next/dynamic';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSafeUser } from '@/lib/auth';
import { MessageSquare, Search, ChevronRight } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { useLang } from '@/lib/lang';

const ChatWindow = nextDynamic(
  () => import('@/components/messages/chat-window').then((m) => m.ChatWindow),
  { ssr: false, loading: () => <div className="flex-1 skeleton" /> }
);

interface MatchResult {
  user: {
    authEmail: string;
    username: string | null;
    avatarUrl: string | null;
    sportTypes: string[];
  };
  score: number;
}

interface ConversationPartner {
  authEmail: string;
  username: string | null;
  avatarUrl: string | null;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

function MessagesPageInner() {
  const user = useSafeUser();
  const { t } = useLang();
  const searchParams = useSearchParams();
  const partnerParam = searchParams.get('partner');
  const partnerName = searchParams.get('name');
  const [partners, setPartners] = useState<ConversationPartner[]>([]);
  const [selected, setSelected] = useState<ConversationPartner | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');

  useEffect(() => {
    async function fetchConversations() {
      try {
        // Fetch matches and conversation previews in parallel (single batch query, no N+1)
        const [matchRes, convRes] = await Promise.all([
          fetch('/api/matches?radius=500'),
          fetch('/api/messages/conversations'),
        ]);

        const matchData: MatchResult[] = matchRes.ok ? await matchRes.json() : [];
        const convData: { partnerId: string; content: string; createdAt: string }[] =
          convRes.ok ? await convRes.json() : [];

        // Build a lookup map for conversation previews
        const convMap = new Map<string, { content: string; createdAt: string }>();
        for (const c of convData) {
          convMap.set(c.partnerId, { content: c.content, createdAt: c.createdAt });
        }

        // Build partner list from matches
        const ps: ConversationPartner[] = matchData.map((m) => {
          const conv = convMap.get(m.user.authEmail);
          return {
            authEmail: m.user.authEmail,
            username: m.user.username,
            avatarUrl: m.user.avatarUrl,
            lastMessage: conv?.content?.slice(0, 50) || undefined,
            lastMessageTime: conv?.createdAt || undefined,
          };
        });

        // Add conversation partners who aren't in matches (e.g. past matches)
        for (const c of convData) {
          if (!ps.some((p) => p.authEmail === c.partnerId)) {
            ps.push({
              authEmail: c.partnerId,
              username: null,
              avatarUrl: null,
              lastMessage: c.content?.slice(0, 50) || undefined,
              lastMessageTime: c.createdAt || undefined,
            });
          }
        }

        // Sort by last message time (newest first)
        ps.sort((a, b) => {
          if (!a.lastMessageTime && !b.lastMessageTime) return 0;
          if (!a.lastMessageTime) return 1;
          if (!b.lastMessageTime) return -1;
          return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
        });

        setPartners(ps);

        // Auto-open a conversation if ?partner=authEmail is in URL
        if (partnerParam) {
          const found = ps.find((p) => p.authEmail === partnerParam);
          if (found) {
            setSelected(found);
          } else {
            // Partner not in matches yet — add stub to list and open chat
            const stub: ConversationPartner = { authEmail: partnerParam, username: partnerName, avatarUrl: null };
            setPartners([stub, ...ps]);
            setSelected(stub);
          }
        }
      } finally {
        setLoading(false);
      }
    }
    fetchConversations();
  }, [partnerParam, partnerName]);

  const filtered = partners.filter((p) =>
    !searchQ || p.username?.toLowerCase().includes(searchQ.toLowerCase())
  );

  if (!user.isLoaded) return null;

  const emptyLabel = t('msg_empty');
  const searchPlaceholder = t('msg_search');
  const title = t('msg_title');
  const selectLabel = t('msg_select');
  const selectSub = t('msg_select_sub');

  // ─── Conversation list panel ─────────────────────────────────────────
  const ConversationList = (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%',
      background: 'var(--bg)',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 16px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'var(--bg-card)',
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
            width: 15, height: 15, color: 'var(--text-dim)',
          }} />
          <input
            type="text"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
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
              <MessageSquare style={{ width: 28, height: 28, color: 'var(--text-dim)' }} />
            </div>
            <p style={{ color: 'var(--text-dim)', fontSize: 13, textAlign: 'center', lineHeight: 1.5 }}>
              {emptyLabel}
            </p>
          </div>
        ) : (
          filtered.map((partner) => {
            const isActive = selected?.authEmail === partner.authEmail;
            return (
              <button
                key={partner.authEmail}
                onClick={() => setSelected(partner)}
                style={{
                  width: '100%', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px',
                  background: isActive ? 'rgba(99,102,241,0.08)' : 'transparent',
                  border: 'none',
                  borderLeft: `3px solid ${isActive ? '#6366F1' : 'transparent'}`,
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
                    background: 'var(--text-dim)', border: '2px solid var(--bg)',
                  }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{
                      color: 'white', fontWeight: 600, fontSize: 14,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {partner.username ?? t('gen_athlete')}
                    </div>
                    {partner.lastMessageTime && (
                      <span style={{ color: 'var(--text-dim)', fontSize: 11, flexShrink: 0 }}>
                        {new Date(partner.lastMessageTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                  <div style={{
                    color: 'var(--text-muted)', fontSize: 14,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    marginTop: 2,
                  }}>
                    {partner.lastMessage ?? t('msg_tap')}
                  </div>
                </div>
                <ChevronRight style={{ width: 15, height: 15, color: 'var(--text-dim)', flexShrink: 0 }} />
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
      background: 'var(--bg)', gap: 16,
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: 'rgba(99,102,241,0.07)',
        border: '2px solid rgba(99,102,241,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <MessageSquare style={{ width: 34, height: 34, color: '#6366F1' }} />
      </div>
      <div>
        <div style={{ color: 'white', fontWeight: 700, fontSize: 16, textAlign: 'center', marginBottom: 6 }}>
          {selectLabel}
        </div>
        <div style={{ color: 'var(--text-dim)', fontSize: 13, textAlign: 'center' }}>{selectSub}</div>
      </div>
    </div>
  );

  return (
    <>
      {/* ─── MOBILE ─── */}
      {/* Full-screen mobile chat: subtract bottom nav height + safe area */}
      <div className="md:hidden" style={{ height: 'calc(100dvh - var(--nav-h, 60px) - env(safe-area-inset-bottom, 0px))', position: 'relative', overflow: 'hidden' }}>
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
              partnerId={selected.authEmail}
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
              partnerId={selected.authEmail}
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

function MessagesPageWithSuspense() {
  return (
    <Suspense fallback={null}>
      <MessagesPageInner />
    </Suspense>
  );
}

export default nextDynamic(() => Promise.resolve({ default: MessagesPageWithSuspense }), { ssr: false });
