'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Users, Send } from 'lucide-react';
import { useLang } from '@/lib/lang';

const TYPE_EMOJI: Record<string, string> = {
  running: '🏃',
  cycling: '🚴',
  gym: '🏋️',
  swimming: '🏊',
  trail_running: '🧗',
  crossfit: '⚡',
  yoga: '🧘',
  other: '💪',
};

function formatDuration(min: number | null) {
  if (!min) return '';
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

function timeAgo(dateStr: string, lang: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return lang === 'pl' ? 'przed chwilą' : 'just now';
  if (mins < 60) return lang === 'pl' ? `${mins} min temu` : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return lang === 'pl' ? `${hours}h temu` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return lang === 'pl' ? `${days}d temu` : `${days}d ago`;
}

interface EnrichedComment {
  id: number;
  workoutLogId: number;
  authorId: string;
  content: string;
  createdAt: string;
  authorName: string | null;
  authorAvatar: string | null;
}

interface FeedLog {
  id: number;
  userId: string;
  date: string;
  type: string;
  name: string;
  durationMin: number | null;
  notes: string | null;
  isPublic: boolean;
  createdAt: string;
  username: string | null;
  avatarUrl: string | null;
  comments: EnrichedComment[];
}

function AvatarCircle({ src, fallback }: { src: string | null; fallback: string }) {
  return (
    <div
      style={{
        width: 38,
        height: 38,
        borderRadius: '50%',
        background: src ? 'transparent' : '#7C3AED',
        overflow: 'hidden',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 15,
        fontWeight: 700,
        color: 'white',
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={fallback} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        fallback.charAt(0).toUpperCase()
      )}
    </div>
  );
}

function CommentRow({ c }: { c: EnrichedComment }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 8 }}>
      <AvatarCircle src={c.authorAvatar} fallback={c.authorName ?? '?'} />
      <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '8px 12px' }}>
        <span style={{ color: '#7C3AED', fontWeight: 700, fontSize: 12, marginRight: 6 }}>
          {c.authorName ?? 'Athlete'}
        </span>
        <span style={{ color: 'var(--text)', fontSize: 13 }}>{c.content}</span>
      </div>
    </div>
  );
}

function WorkoutCard({ log, onCommentAdded }: { log: FeedLog; onCommentAdded: (logId: number, comment: EnrichedComment) => void }) {
  const { lang, t } = useLang();
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const emoji = TYPE_EMOJI[log.type] ?? '💪';
  const duration = formatDuration(log.durationMin);

  async function submitComment() {
    const trimmed = commentText.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/feed/${log.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      });
      if (res.ok) {
        const newComment = await res.json() as EnrichedComment;
        onCommentAdded(log.id, newComment);
        setCommentText('');
      }
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitComment();
    }
  }

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 24,
        padding: '20px 20px 16px',
        marginBottom: 16,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <AvatarCircle src={log.avatarUrl} fallback={log.username ?? '?'} />
        <div style={{ flex: 1 }}>
          <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: 14 }}>
            {log.username ?? 'Athlete'}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
            {timeAgo(log.createdAt, lang)}
          </div>
        </div>
        <span style={{ fontSize: 28 }}>{emoji}</span>
      </div>

      {/* Workout info */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ color: 'var(--text)', fontWeight: 800, fontSize: 17, marginBottom: 4 }}>
          {log.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span
            style={{
              background: 'rgba(124,58,237,0.15)',
              border: '1px solid rgba(124,58,237,0.3)',
              color: '#7C3AED',
              borderRadius: 20,
              padding: '2px 10px',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {log.type}
          </span>
          {duration && (
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              {duration}
            </span>
          )}
        </div>
        {log.notes && (
          <p style={{
            color: 'var(--text-muted)', fontSize: 13, marginTop: 8,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {log.notes}
          </p>
        )}
      </div>

      {/* Divider */}
      {log.comments.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', marginBottom: 8 }} />
      )}

      {/* Comments */}
      {log.comments.map((c) => (
        <CommentRow key={c.id} c={c} />
      ))}

      {/* Comment input */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
        <input
          ref={inputRef}
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('feed_comment_placeholder')}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border)',
            borderRadius: 18,
            padding: '8px 14px',
            color: 'var(--text)',
            fontSize: 13,
            outline: 'none',
          }}
        />
        <button
          onClick={submitComment}
          disabled={!commentText.trim() || sending}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: commentText.trim() ? '#7C3AED' : 'rgba(255,255,255,0.08)',
            border: 'none',
            cursor: commentText.trim() ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'background 0.2s',
          }}
        >
          <Send style={{ width: 15, height: 15, color: 'white' }} />
        </button>
      </div>
    </div>
  );
}

export default function FriendsFeedPage() {
  const { t, lang } = useLang();
  const [logs, setLogs] = useState<FeedLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeed();
  }, []);

  async function fetchFeed() {
    setLoading(true);
    try {
      const res = await fetch('/api/feed');
      if (res.ok) {
        const data = await res.json() as FeedLog[];
        setLogs(data);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleCommentAdded(logId: number, comment: EnrichedComment) {
    setLogs((prev) =>
      prev.map((log) =>
        log.id === logId
          ? { ...log, comments: [...log.comments, comment] }
          : log
      )
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px 80px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: 'var(--text)', fontWeight: 800, fontSize: 26, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {t('feed_title')}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          {lang === 'pl' ? 'Aktywności twoich znajomych z ostatnich 30 dni' : 'Your friends\' activities from the last 30 days'}
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 24,
                height: 140,
                opacity: 0.5,
              }}
            />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 24,
            padding: '48px 24px',
            textAlign: 'center',
          }}
        >
          <Users style={{ width: 48, height: 48, color: 'var(--border)', margin: '0 auto 16px' }} />
          <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
            {t('feed_empty')}
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
            {lang === 'pl'
              ? 'Zaakceptowane zaproszenia pojawią się tutaj.'
              : 'Accepted friend requests will appear here.'}
          </p>
          <Link
            href="/friends"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 20px',
              background: '#7C3AED',
              borderRadius: 20,
              color: 'white',
              fontWeight: 700,
              fontSize: 13,
              textDecoration: 'none',
            }}
          >
            {lang === 'pl' ? 'Dodaj znajomych' : 'Add friends'}
          </Link>
        </div>
      ) : (
        logs.map((log) => (
          <WorkoutCard key={log.id} log={log} onCommentAdded={handleCommentAdded} />
        ))
      )}
    </div>
  );
}
