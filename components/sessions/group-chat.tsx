'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

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

export function GroupChat({ sessionId, currentUserId, currentUsername }: GroupChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<{ unbind_all: () => void; unsubscribe: () => void } | null>(null);
  const pusherRef = useRef<{ disconnect: () => void } | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/messages`);
      if (res.ok) {
        const data: ChatMessage[] = await res.json();
        setMessages(data);
      }
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
          });
          pusherRef.current = pusherInstance;
          const ch = pusherInstance.subscribe(`session-${sessionId}`);
          channelRef.current = ch;
          ch.bind('new-message', (data: ChatMessage) => {
            setMessages((prev) => {
              // Avoid duplicate if already in list
              if (prev.some((m) => m.id === data.id)) return prev;
              return [...prev, data];
            });
          });
        } catch (err) {
          console.error('Pusher init failed, falling back to polling:', err);
          // Fallback to polling
          pollingRef.current = setInterval(fetchMessages, 10000);
        }
      })();
      return () => {
        mounted = false;
        channelRef.current?.unbind_all();
        channelRef.current?.unsubscribe();
        pusherRef.current?.disconnect();
      };
    } else {
      // No Pusher key: poll every 10 seconds
      pollingRef.current = setInterval(fetchMessages, 10000);
      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
      };
    }
  }, [sessionId, fetchMessages]);

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
        if (!process.env.NEXT_PUBLIC_PUSHER_KEY) {
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

  return (
    <div className="h-96 flex flex-col bg-zinc-900 rounded-3xl border border-zinc-700">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
            Brak wiadomości. Napisz pierwszy!
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
                  <span className="text-xs text-zinc-400 px-1">
                    {msg.username ?? 'Anonim'}
                  </span>
                )}
                <div
                  className={`px-3 py-2 text-sm leading-relaxed ${
                    isOwn
                      ? 'bg-violet-600 text-white rounded-3xl rounded-br-sm'
                      : 'bg-zinc-700 text-zinc-100 rounded-3xl rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-[10px] text-zinc-500 px-1">
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

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-zinc-700 p-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Napisz wiadomość..."
          className="flex-1 bg-zinc-800 border border-zinc-600 rounded-3xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
        />
        <Button
          size="icon-sm"
          onClick={handleSend}
          loading={sending}
          disabled={!input.trim() || sending}
          className="shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
