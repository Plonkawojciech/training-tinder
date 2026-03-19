'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Send, RefreshCw, ChevronUp } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { useLang } from '@/lib/lang';

interface ChatMessage {
  id: number;
  sessionId: number;
  senderId: string;
  content: string;
  createdAt: string;
  username: string | null;
  avatarUrl: string | null;
}

interface GroupChatProps {
  sessionId: number;
  currentUserId: string;
  currentUsername: string | null;
}

const PAGE_SIZE = 50;

export function GroupChat({ sessionId, currentUserId, currentUsername }: GroupChatProps) {
  const { t } = useLang();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connectionState, setConnectionState] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<{
    unbind_all: () => void;
    unsubscribe: () => void;
    trigger: (event: string, data: unknown) => void;
  } | null>(null);
  const pusherRef = useRef<{
    disconnect: () => void;
    connection: { bind: (event: string, cb: (data?: { current: string }) => void) => void };
  } | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingEmitRef = useRef(0);

  const fetchMessages = useCallback(async (offset = 0, prepend = false) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/messages?limit=${PAGE_SIZE}&offset=${offset}`);
      if (res.ok) {
        const data: ChatMessage[] = await res.json();
        if (prepend) {
          setMessages((prev) => [...data, ...prev]);
        } else {
          setMessages(data);
        }
        setHasMore(data.length >= PAGE_SIZE);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Auto-scroll to bottom when messages change (but not when loading older)
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!loadingMore) scrollToBottom();
  }, [messages, loadingMore, scrollToBottom]);

  // Subscribe to Pusher or fallback to polling
  useEffect(() => {
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;

    if (pusherKey) {
      let mounted = true;
      (async () => {
        try {
          const PusherJs = (await import('pusher-js')).default;
          if (!mounted) return;
          const pusherInstance = new PusherJs(pusherKey, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? 'eu',
            authEndpoint: '/api/pusher/auth',
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pusherRef.current = pusherInstance as any;

          // Connection state tracking
          pusherInstance.connection.bind('connected', () => {
            if (mounted) setConnectionState('connected');
          });
          pusherInstance.connection.bind('connecting', () => {
            if (mounted) setConnectionState('connecting');
          });
          pusherInstance.connection.bind('disconnected', () => {
            if (mounted) setConnectionState('disconnected');
          });
          pusherInstance.connection.bind('unavailable', () => {
            if (mounted) setConnectionState('disconnected');
          });
          pusherInstance.connection.bind('failed', () => {
            if (mounted) setConnectionState('disconnected');
          });

          const ch = pusherInstance.subscribe(`private-session-${sessionId}`);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          channelRef.current = ch as any;

          ch.bind('new-message', (data: ChatMessage) => {
            setMessages((prev) => {
              if (prev.some((m) => m.id === data.id)) return prev;
              return [...prev, data];
            });
            // Clear typing for this sender
            setTypingUsers((prev) => {
              const next = new Set(prev);
              next.delete(data.senderId);
              return next;
            });
          });

          // Typing indicator
          ch.bind('client-typing', (data: { userId: string; username: string }) => {
            if (data.userId === currentUserId) return;
            setTypingUsers((prev) => new Set(prev).add(data.username || data.userId));
            // Auto-clear after 3s
            setTimeout(() => {
              setTypingUsers((prev) => {
                const next = new Set(prev);
                next.delete(data.username || data.userId);
                return next;
              });
            }, 3000);
          });

          // Participant events
          ch.bind('participant-joined', () => { /* Could show a system message */ });
          ch.bind('participant-left', () => { /* Could show a system message */ });

        } catch (err) {
          console.error('Pusher init failed, falling back to polling:', err);
          if (mounted) setConnectionState('disconnected');
          pollingRef.current = setInterval(fetchMessages, 10000);
        }
      })();
      return () => {
        mounted = false;
        channelRef.current?.unbind_all();
        channelRef.current?.unsubscribe();
        pusherRef.current?.disconnect();
        if (pollingRef.current) clearInterval(pollingRef.current);
      };
    } else {
      setConnectionState('disconnected');
      pollingRef.current = setInterval(fetchMessages, 10000);
      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
      };
    }
  }, [sessionId, fetchMessages, currentUserId]);

  // Emit typing event (throttled to once per 2s)
  const emitTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingEmitRef.current < 2000) return;
    lastTypingEmitRef.current = now;
    try {
      channelRef.current?.trigger('client-typing', {
        userId: currentUserId,
        username: currentUsername,
      });
    } catch { /* channel may not support client events */ }
  }, [currentUserId, currentUsername]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInput(e.target.value);
    if (e.target.value.trim()) {
      emitTyping();
      // Reset typing timeout
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        // Typing stopped
      }, 3000);
    }
  }

  async function handleSend() {
    const content = input.trim();
    if (!content || sending) return;

    setSending(true);
    setInput('');
    try {
      const res = await fetch(`/api/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const msg: ChatMessage = await res.json();
        // If no Pusher, add message manually
        if (!process.env.NEXT_PUBLIC_PUSHER_KEY || connectionState === 'disconnected') {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      }
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function handleLoadEarlier() {
    setLoadingMore(true);
    await fetchMessages(messages.length, true);
  }

  function handleRefresh() {
    fetchMessages();
  }

  const typingText = typingUsers.size > 0
    ? `${[...typingUsers].slice(0, 2).join(', ')} ${t('chat_typing')}`
    : null;

  return (
    <div className="h-96 flex flex-col bg-[var(--bg)] rounded-3xl border border-[var(--border)]">
      {/* Connection banner */}
      {connectionState === 'disconnected' && (
        <div
          className="flex items-center justify-between px-4 py-2 text-xs font-medium rounded-t-3xl"
          style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}
        >
          <span>{t('chat_offline_banner')}</span>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1 underline hover:no-underline"
          >
            <RefreshCw className="w-3 h-3" />
            {t('chat_refresh')}
          </button>
        </div>
      )}
      {connectionState === 'connecting' && (
        <div
          className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-t-3xl"
          style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}
        >
          <div className="w-3 h-3 border-2 border-[#F59E0B] border-t-transparent rounded-full animate-spin" />
          {t('chat_reconnecting')}
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3" aria-live="polite">
        {/* Load earlier button */}
        {hasMore && !loading && (
          <button
            onClick={handleLoadEarlier}
            disabled={loadingMore}
            className="self-center flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors py-1 px-3 rounded-full bg-[var(--bg-card)]"
          >
            {loadingMore ? (
              <div className="w-3 h-3 border-2 border-[var(--text-muted)] border-t-transparent rounded-full animate-spin" />
            ) : (
              <ChevronUp className="w-3 h-3" />
            )}
            {t('chat_load_earlier')}
          </button>
        )}

        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-sm">
            {t('chat_no_messages')}
          </div>
        )}

        {messages.map((msg) => {
          const isOwn = msg.senderId === currentUserId;
          return (
            <div
              key={msg.id}
              className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {!isOwn && (
                <Avatar
                  src={msg.avatarUrl}
                  fallback={msg.username ?? '?'}
                  size="sm"
                />
              )}
              <div className={`flex flex-col gap-0.5 max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                {!isOwn && (
                  <span className="text-xs text-[var(--text-muted)] px-1">
                    {msg.username ?? t('gen_anonymous')}
                  </span>
                )}
                <div
                  className={`px-3 py-2 text-sm leading-relaxed ${
                    isOwn
                      ? 'bg-violet-600 text-white rounded-3xl rounded-br-sm'
                      : 'bg-[var(--bg-elevated)] text-[var(--text)] rounded-3xl rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-[10px] text-[var(--text-muted)] px-1">
                  {formatRelativeTime(msg.createdAt)}
                </span>
              </div>
              {isOwn && (
                <Avatar
                  src={null}
                  fallback={currentUsername ?? '?'}
                  size="sm"
                />
              )}
            </div>
          );
        })}

        {/* Typing indicator */}
        {typingText && (
          <div className="text-xs text-[var(--text-muted)] italic px-1 animate-pulse" aria-live="polite">
            {typingText}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-[var(--border)] p-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={t('chat_placeholder')}
          aria-label={t('chat_placeholder')}
          className="flex-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--text-dim)] focus:outline-none focus:border-violet-500 transition-colors"
        />
        <Button
          size="icon-sm"
          onClick={handleSend}
          loading={sending}
          disabled={!input.trim() || sending}
          className="shrink-0"
          aria-label={t('chat_send_aria')}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
