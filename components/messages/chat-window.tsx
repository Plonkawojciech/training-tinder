'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import Pusher from 'pusher-js';
import { Avatar } from '@/components/ui/avatar';
import { formatRelativeTime } from '@/lib/utils';

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
}

export function ChatWindow({
  currentUserId,
  partnerId,
  partnerName,
  partnerAvatar,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY ?? '', {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? 'eu',
      authEndpoint: '/api/pusher/auth',
    });

    const channel = pusher.subscribe(`private-chat-${currentUserId}`);
    channel.bind('new-message', (data: Message) => {
      if (
        (data.senderId === partnerId && data.receiverId === currentUserId) ||
        (data.senderId === currentUserId && data.receiverId === partnerId)
      ) {
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

    try {
      await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: partnerId, content }),
      });
    } catch {
      setInput(content);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A]">
      {/* Chat header */}
      <div className="flex items-center gap-3 p-4 border-b border-[#2A2A2A] bg-[#111111]">
        <Avatar src={partnerAvatar} fallback={partnerName ?? '?'} size="md" />
        <div>
          <h3 className="font-semibold text-white text-sm">{partnerName ?? 'Athlete'}</h3>
          <p className="text-xs text-[#888888]">Training partner</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {loading && (
          <div className="flex items-center justify-center h-20">
            <div className="w-5 h-5 border-2 border-[#FF4500] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[#888888] text-sm text-center">
              No messages yet. Say hello!
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isSent = msg.senderId === currentUserId;
          return (
            <div
              key={msg.id}
              className={`flex flex-col gap-1 max-w-xs ${isSent ? 'self-end items-end' : 'self-start items-start'}`}
            >
              <div
                className={`px-3 py-2 text-sm ${
                  isSent
                    ? 'bg-[#FF4500] text-white'
                    : 'bg-[#1A1A1A] text-white border border-[#2A2A2A]'
                }`}
              >
                {msg.content}
              </div>
              <span className="text-[10px] text-[#444444]">
                {formatRelativeTime(msg.createdAt)}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={sendMessage}
        className="flex items-center gap-2 p-4 border-t border-[#2A2A2A] bg-[#111111]"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-[#0A0A0A] border border-[#2A2A2A] text-white px-3 py-2 text-sm focus:border-[#FF4500] focus:outline-none placeholder:text-[#444444]"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="w-10 h-10 bg-[#FF4500] text-white flex items-center justify-center disabled:opacity-50 hover:shadow-[0_0_15px_rgba(255,69,0,0.4)] transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
