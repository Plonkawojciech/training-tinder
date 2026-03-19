'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Send, ArrowLeft, MoreVertical, RefreshCw } from 'lucide-react';
import Pusher, { Channel } from 'pusher-js';
import { Avatar } from '@/components/ui/avatar';
import { formatRelativeTime } from '@/lib/utils';
import { useLang } from '@/lib/lang';

interface Message {
  id: number;
  senderId: string;
  receiverId: string;
  content: string;
  read: boolean;
  createdAt: string;
}

interface ChatWindowProps {
  currentUserId: string;
  partnerId: string;
  partnerName: string | null;
  partnerAvatar: string | null;
  onBack?: () => void;
}

export function ChatWindow({
  currentUserId,
  partnerId,
  partnerName,
  partnerAvatar,
  onBack,
}: ChatWindowProps) {
  const { t } = useLang();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [pusherConnected, setPusherConnected] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<Channel | null>(null);
  const partnerTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages?partnerId=${partnerId}`);
      if (res.ok) {
        const data: Message[] = await res.json();
        setMessages(data);
      }
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    fetchMessages();

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY ?? '', {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? 'eu',
      authEndpoint: '/api/pusher/auth',
    });

    // Track Pusher connection state
    pusher.connection.bind('connected', () => setPusherConnected(true));
    pusher.connection.bind('disconnected', () => setPusherConnected(false));
    pusher.connection.bind('unavailable', () => setPusherConnected(false));
    pusher.connection.bind('failed', () => setPusherConnected(false));

    const channel = pusher.subscribe(`private-chat-${currentUserId}`);
    channelRef.current = channel;

    channel.bind('new-message', (data: Message) => {
      // Skip messages sent by currentUser — they were added optimistically
      if (data.senderId === currentUserId) return;
      if (data.senderId === partnerId && data.receiverId === currentUserId) {
        setMessages((prev) => [...prev, data]);
        // Clear typing indicator when a message arrives from partner
        setPartnerTyping(false);
      }
    });

    // Listen for partner typing events
    channel.bind('client-typing', (data: { userId: string }) => {
      if (data.userId === partnerId) {
        setPartnerTyping(true);
        // Clear any existing timeout
        if (partnerTypingTimeoutRef.current) {
          clearTimeout(partnerTypingTimeoutRef.current);
        }
        // Auto-hide typing indicator after 3 seconds
        partnerTypingTimeoutRef.current = setTimeout(() => {
          setPartnerTyping(false);
        }, 3000);
      }
    });

    return () => {
      channelRef.current = null;
      pusher.unsubscribe(`private-chat-${currentUserId}`);
      pusher.disconnect();
      if (partnerTypingTimeoutRef.current) {
        clearTimeout(partnerTypingTimeoutRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [currentUserId, partnerId, fetchMessages]);

  // Emit typing event when the user types
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInput(e.target.value);

    // Throttle typing events — only send once per 2 seconds
    if (!typingTimeoutRef.current && channelRef.current) {
      try {
        channelRef.current.trigger('client-typing', { userId: currentUserId });
      } catch {
        // client events may not be enabled — silently ignore
      }
      typingTimeoutRef.current = setTimeout(() => {
        typingTimeoutRef.current = null;
      }, 2000);
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;

    setSending(true);
    const content = input.trim();
    setInput('');
    inputRef.current?.focus();

    // Optimistic update — show message immediately before server confirms
    const optimisticMsg: Message = {
      id: Date.now(),
      senderId: currentUserId,
      receiverId: partnerId,
      content,
      read: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: partnerId, content }),
      });
    } catch {
      // On failure, remove optimistic message and restore input
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      setInput(content);
    } finally {
      setSending(false);
    }
  }

  // Group messages by date
  function getDayLabel(dateStr: string) {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return t('chat_today');
    if (d.toDateString() === yesterday.toDateString()) return t('chat_yesterday');
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  }

  // Group consecutive messages by sender
  const grouped: { msg: Message; showAvatar: boolean; dayLabel?: string }[] = [];
  let lastDate = '';
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const dayLabel = getDayLabel(msg.createdAt);
    const nextMsg = messages[i + 1];
    const showAvatar =
      msg.senderId !== currentUserId &&
      (!nextMsg || nextMsg.senderId !== msg.senderId);
    grouped.push({
      msg,
      showAvatar,
      dayLabel: dayLabel !== lastDate ? dayLabel : undefined,
    });
    lastDate = dayLabel;
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--bg)',
        position: 'relative',
      }}
    >
      {/* Subtle grid background */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)',
        opacity: 0.3,
        backgroundSize: '24px 24px',
      }} />

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px',
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        backdropFilter: 'blur(20px)',
        flexShrink: 0,
        zIndex: 2,
      }}>
        {onBack && (
          <button
            onClick={onBack}
            aria-label={t('chat_back_aria')}
            style={{
              width: 44, height: 44, borderRadius: 99,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0, color: 'var(--text)',
            }}
          >
            <ArrowLeft style={{ width: 16, height: 16 }} />
          </button>
        )}

        <Link href={`/profile/${partnerId}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flex: 1, minWidth: 0 }}>
          <div style={{ flexShrink: 0, position: 'relative' }}>
            <Avatar src={partnerAvatar} fallback={partnerName ?? '?'} size="sm" />
            {/* Online status dot */}
            <span style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 10, height: 10, borderRadius: '50%',
              background: '#22C55E',
              border: '2px solid var(--bg-card)',
              display: pusherConnected ? 'block' : 'none',
            }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>
              {partnerName ?? t('gen_athlete')}
            </div>
            <div
              aria-live="polite"
              aria-atomic="true"
              style={{ minHeight: 16 }}
            >
              {partnerTyping && (
                <div style={{
                  color: '#818CF8', fontSize: 12, fontWeight: 500, lineHeight: 1.2,
                  animation: 'chatTypingFade 0.3s ease-in',
                }}>
                  {t('chat_typing')}
                </div>
              )}
            </div>
          </div>
        </Link>

        <button
          aria-label={t('chat_more_aria')}
          style={{
          width: 44, height: 44, borderRadius: 99,
          background: 'transparent', border: 'none',
          color: 'var(--text-dim)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <MoreVertical style={{ width: 18, height: 18 }} />
        </button>
      </div>

      {/* Offline / disconnected banner */}
      {!pusherConnected && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '8px 16px',
          background: 'rgba(239,68,68,0.1)',
          borderBottom: '1px solid rgba(239,68,68,0.2)',
          fontSize: 13, color: '#EF4444', fontWeight: 500,
          flexShrink: 0, zIndex: 2,
        }}>
          <span>{t('chat_offline_banner')}</span>
          <button
            type="button"
            onClick={() => { setLoading(true); fetchMessages(); }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', borderRadius: 6,
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#EF4444', fontWeight: 600, fontSize: 12,
              cursor: 'pointer',
            }}
          >
            <RefreshCw style={{ width: 12, height: 12 }} />
            {t('chat_refresh')}
          </button>
        </div>
      )}

      {/* Typing indicator animation */}
      <style>{`@keyframes chatTypingFade{from{opacity:0}to{opacity:1}}`}</style>

      {/* Messages area */}
      <div
        aria-live="polite"
        style={{
        flex: 1, overflowY: 'auto', padding: '16px 12px',
        display: 'flex', flexDirection: 'column', gap: 2,
        position: 'relative', zIndex: 1,
      }}>
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              border: '2px solid var(--accent, #6366F1)', borderTopColor: 'transparent',
              animation: 'spin 0.8s linear infinite',
            }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12, padding: '40px 20px',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(99,102,241,0.1)',
              border: '2px solid rgba(99,102,241,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24,
            }}>👋</div>
            <p style={{ color: 'var(--text-dim)', fontSize: 14, textAlign: 'center', lineHeight: 1.5 }}>
              {t('chat_empty')}<br />
              <span style={{ color: '#818CF8', fontWeight: 700 }}>{partnerName ?? t('gen_athlete')}</span>
            </p>
          </div>
        )}

        {grouped.map(({ msg, showAvatar, dayLabel }, i) => {
          const isSent = msg.senderId === currentUserId;
          return (
            <React.Fragment key={msg.id}>
              {dayLabel && (
                <div style={{
                  textAlign: 'center', color: 'var(--text-dim)', fontSize: 11,
                  fontWeight: 600, letterSpacing: '0.04em',
                  margin: '12px 0 4px',
                }}>
                  {dayLabel}
                </div>
              )}
              <div style={{
                display: 'flex',
                flexDirection: isSent ? 'row-reverse' : 'row',
                alignItems: 'flex-end',
                gap: 6,
                marginBottom: showAvatar || i === grouped.length - 1 ? 4 : 1,
              }}>
                {/* Avatar placeholder for received messages */}
                {!isSent && (
                  <div style={{ width: 28, flexShrink: 0, alignSelf: 'flex-end' }}>
                    {showAvatar && (
                      <Avatar src={partnerAvatar} fallback={partnerName ?? '?'} size="xs" />
                    )}
                  </div>
                )}

                <div style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: isSent ? 'flex-end' : 'flex-start',
                  maxWidth: '72%',
                  gap: 2,
                }}>
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: isSent ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: isSent
                      ? 'linear-gradient(135deg, #6366F1, #818CF8)'
                      : 'var(--bg-elevated)',
                    border: isSent ? 'none' : '1px solid var(--border)',
                    color: isSent ? 'white' : 'var(--text)',
                    fontSize: 14,
                    lineHeight: 1.45,
                    boxShadow: isSent
                      ? '0 2px 12px rgba(99,102,241,0.25)'
                      : '0 1px 4px rgba(0,0,0,0.4)',
                    wordBreak: 'break-word',
                  }}>
                    {msg.content}
                  </div>
                  {showAvatar && (
                    <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>
                      {formatRelativeTime(msg.createdAt)}
                    </span>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <form
        onSubmit={sendMessage}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px',
          background: 'var(--bg-card)',
          borderTop: '1px solid var(--border)',
          backdropFilter: 'blur(20px)',
          flexShrink: 0, zIndex: 2,
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder={t('chat_placeholder')}
          aria-label={t('chat_placeholder')}
          style={{
            flex: 1,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 32,
            padding: '11px 18px',
            color: 'var(--text)',
            fontSize: 14,
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => { e.target.style.borderColor = 'rgba(99,102,241,0.5)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          aria-label={t('chat_send_aria')}
          style={{
            width: 44, height: 44, borderRadius: '50%',
            background: input.trim() && !sending
              ? 'linear-gradient(135deg, #6366F1, #818CF8)'
              : 'var(--bg-elevated)',
            border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: input.trim() && !sending ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
            flexShrink: 0,
            boxShadow: input.trim() && !sending ? '0 4px 14px rgba(99,102,241,0.3)' : 'none',
          }}
        >
          <Send style={{
            width: 16, height: 16,
            color: input.trim() && !sending ? 'white' : 'var(--text-dim)',
            transform: 'translateX(1px)',
          }} />
        </button>
      </form>
    </div>
  );
}
