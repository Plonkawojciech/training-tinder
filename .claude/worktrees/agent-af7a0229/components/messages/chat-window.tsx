'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, MoreVertical } from 'lucide-react';
import Pusher from 'pusher-js';
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
  const { t, lang } = useLang();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMessages();

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY ?? '', {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? 'eu',
      authEndpoint: '/api/pusher/auth',
    });

    const channel = pusher.subscribe(`private-chat-${currentUserId}`);
    channel.bind('new-message', (data: Message) => {
      // Skip messages sent by currentUser — they were added optimistically
      if (data.senderId === currentUserId) return;
      if (data.senderId === partnerId && data.receiverId === currentUserId) {
        setMessages((prev) => [...prev, data]);
      }
    });

    return () => {
      pusher.unsubscribe(`private-chat-${currentUserId}`);
      pusher.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, partnerId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function fetchMessages() {
    try {
      const res = await fetch(`/api/messages?partnerId=${partnerId}`);
      if (res.ok) {
        const data: Message[] = await res.json();
        setMessages(data);
      }
    } finally {
      setLoading(false);
    }
  }

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
    if (d.toDateString() === today.toDateString()) return lang === 'en' ? 'Today' : 'Dzisiaj';
    if (d.toDateString() === yesterday.toDateString()) return lang === 'en' ? 'Yesterday' : 'Wczoraj';
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
        background: '#080808',
        position: 'relative',
      }}
    >
      {/* Subtle grid background */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.015) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }} />

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px',
        background: 'rgba(12,12,12,0.97)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(20px)',
        flexShrink: 0,
        zIndex: 2,
      }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              width: 36, height: 36, borderRadius: 99,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0, color: 'white',
            }}
          >
            <ArrowLeft style={{ width: 16, height: 16 }} />
          </button>
        )}

        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Avatar src={partnerAvatar} fallback={partnerName ?? '?'} size="sm" />
          <span style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 9, height: 9, borderRadius: '50%',
            background: '#00E676', border: '2px solid #0C0C0C',
          }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: 'white', fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>
            {partnerName ?? 'Athlete'}
          </div>
          <div style={{ color: '#00E676', fontSize: 11, fontWeight: 600 }}>online</div>
        </div>

        <button style={{
          width: 36, height: 36, borderRadius: 99,
          background: 'transparent', border: 'none',
          color: '#555', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <MoreVertical style={{ width: 18, height: 18 }} />
        </button>
      </div>

      {/* Messages area */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px 12px',
        display: 'flex', flexDirection: 'column', gap: 2,
        position: 'relative', zIndex: 1,
      }}>
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              border: '2px solid #7C3AED', borderTopColor: 'transparent',
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
              background: 'rgba(124,58,237,0.1)',
              border: '2px solid rgba(124,58,237,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24,
            }}>👋</div>
            <p style={{ color: '#555', fontSize: 14, textAlign: 'center', lineHeight: 1.5 }}>
              {t('chat_empty')}<br />
              <span style={{ color: '#8B5CF6', fontWeight: 700 }}>{partnerName ?? 'Athlete'}</span>
            </p>
          </div>
        )}

        {grouped.map(({ msg, showAvatar, dayLabel }, i) => {
          const isSent = msg.senderId === currentUserId;
          return (
            <React.Fragment key={msg.id}>
              {dayLabel && (
                <div style={{
                  textAlign: 'center', color: '#444', fontSize: 11,
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
                      ? 'linear-gradient(135deg, #7C3AED, #8B5CF6)'
                      : 'rgba(30,30,30,1)',
                    border: isSent ? 'none' : '1px solid rgba(255,255,255,0.07)',
                    color: 'white',
                    fontSize: 14,
                    lineHeight: 1.45,
                    boxShadow: isSent
                      ? '0 2px 12px rgba(124,58,237,0.25)'
                      : '0 1px 4px rgba(0,0,0,0.4)',
                    wordBreak: 'break-word',
                  }}>
                    {msg.content}
                  </div>
                  {showAvatar && (
                    <span style={{ color: '#3A3A3A', fontSize: 10 }}>
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
          background: 'rgba(10,10,10,0.97)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
          flexShrink: 0, zIndex: 2,
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('chat_placeholder')}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 32,
            padding: '11px 18px',
            color: 'white',
            fontSize: 14,
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => { e.target.style.borderColor = 'rgba(124,58,237,0.5)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          style={{
            width: 44, height: 44, borderRadius: '50%',
            background: input.trim() && !sending
              ? 'linear-gradient(135deg, #7C3AED, #8B5CF6)'
              : 'rgba(255,255,255,0.06)',
            border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: input.trim() && !sending ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
            flexShrink: 0,
            boxShadow: input.trim() && !sending ? '0 4px 14px rgba(124,58,237,0.3)' : 'none',
          }}
        >
          <Send style={{
            width: 16, height: 16,
            color: input.trim() && !sending ? 'white' : '#444',
            transform: 'translateX(1px)',
          }} />
        </button>
      </form>
    </div>
  );
}
