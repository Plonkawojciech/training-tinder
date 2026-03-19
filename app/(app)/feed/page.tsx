'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Users, Send, Heart, Plus } from 'lucide-react';
import { useLang } from '@/lib/lang';

const PAGE_SIZE = 10;

const TYPE_EMOJI: Record<string, string> = {
  running: '\u{1F3C3}',
  cycling: '\u{1F6B4}',
  gym: '\u{1F3CB}\uFE0F',
  swimming: '\u{1F3CA}',
  trail_running: '\u{1F9D7}',
  crossfit: '\u26A1',
  yoga: '\u{1F9D8}',
  other: '\u{1F4AA}',
};

function formatDuration(min: number | null) {
  if (!min) return '';
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

function timeAgo(dateStr: string, lang: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return lang === 'pl' ? 'przed chwil\u0105' : 'just now';
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
  likeCount: number;
  likedByMe: boolean;
}

function AvatarCircle({ src, fallback }: { src: string | null; fallback: string }) {
  return (
    <div
      style={{
        width: 38,
        height: 38,
        borderRadius: '50%',
        background: src ? 'transparent' : '#6366F1',
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
        <Image src={src} alt={fallback} width={38} height={38} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        fallback.charAt(0).toUpperCase()
      )}
    </div>
  );
}

function CommentRow({ c }: { c: EnrichedComment }) {
  const { t } = useLang();
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 8 }}>
      <AvatarCircle src={c.authorAvatar} fallback={c.authorName ?? '?'} />
      <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '8px 12px' }}>
        <span style={{ color: '#6366F1', fontWeight: 700, fontSize: 12, marginRight: 6 }}>
          {c.authorName ?? t('gen_athlete')}
        </span>
        <span style={{ color: 'var(--text)', fontSize: 13 }}>{c.content}</span>
      </div>
    </div>
  );
}

function WorkoutCard({
  log,
  onCommentAdded,
  onLikeToggled,
}: {
  log: FeedLog;
  onCommentAdded: (logId: number, comment: EnrichedComment) => void;
  onLikeToggled: (logId: number, liked: boolean) => void;
}) {
  const { lang, t } = useLang();
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);
  const [liking, setLiking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const emoji = TYPE_EMOJI[log.type] ?? '\u{1F4AA}';
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

  async function toggleLike() {
    if (liking) return;
    setLiking(true);
    try {
      const res = await fetch(`/api/feed/${log.id}/like`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json() as { liked: boolean };
        onLikeToggled(log.id, data.liked);
      }
    } finally {
      setLiking(false);
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
        padding: '20px 20px 16px',
        marginBottom: 16,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <AvatarCircle src={log.avatarUrl} fallback={log.username ?? '?'} />
        <div style={{ flex: 1 }}>
          <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: 14 }}>
            {log.username ?? t('gen_athlete')}
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
              background: 'rgba(99,102,241,0.15)',
              border: '1px solid rgba(99,102,241,0.3)',
              color: '#6366F1',
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

      {/* Like button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <button
          onClick={toggleLike}
          disabled={liking}
          aria-label="Like"
          style={{
            background: 'none',
            border: 'none',
            cursor: liking ? 'not-allowed' : 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            transition: 'transform 0.15s',
          }}
        >
          <Heart
            style={{
              width: 20,
              height: 20,
              color: log.likedByMe ? '#EF4444' : 'var(--text-muted)',
              fill: log.likedByMe ? '#EF4444' : 'none',
              transition: 'color 0.2s, fill 0.2s',
            }}
          />
        </button>
        {log.likeCount > 0 && (
          <span style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>
            {log.likeCount}
          </span>
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
            background: commentText.trim() ? '#6366F1' : 'rgba(255,255,255,0.08)',
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
  const { t } = useLang();
  const [logs, setLogs] = useState<FeedLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchFeed = useCallback(async (offset: number, append: boolean) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    try {
      const res = await fetch(`/api/feed?limit=${PAGE_SIZE}&offset=${offset}`);
      if (res.ok) {
        const data = await res.json() as FeedLog[];
        if (append) {
          setLogs((prev) => [...prev, ...data]);
        } else {
          setLogs(data);
        }
        setHasMore(data.length >= PAGE_SIZE);
      }
    } finally {
      if (append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchFeed(0, false);
  }, [fetchFeed]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (loading || !hasMore) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && hasMore) {
          fetchFeed(logs.length, true);
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loading, loadingMore, hasMore, logs.length, fetchFeed]);

  function handleCommentAdded(logId: number, comment: EnrichedComment) {
    setLogs((prev) =>
      prev.map((log) =>
        log.id === logId
          ? { ...log, comments: [...log.comments, comment] }
          : log
      )
    );
  }

  function handleLikeToggled(logId: number, liked: boolean) {
    setLogs((prev) =>
      prev.map((log) =>
        log.id === logId
          ? {
              ...log,
              likedByMe: liked,
              likeCount: liked ? log.likeCount + 1 : Math.max(0, log.likeCount - 1),
            }
          : log
      )
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px 0', paddingBottom: 'var(--page-pb)' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: 'var(--text)', fontWeight: 800, fontSize: 26, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {t('feed_title')}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          {t('feed_subtitle')}
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
                        padding: '48px 24px',
            textAlign: 'center',
          }}
        >
          <Users style={{ width: 48, height: 48, color: 'var(--border)', margin: '0 auto 16px' }} />
          <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
            {t('feed_empty')}
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
            {t('feed_no_activity')}
          </p>
          <Link
            href="/friends"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 20px',
              background: '#6366F1',
              borderRadius: 20,
              color: 'white',
              fontWeight: 700,
              fontSize: 13,
              textDecoration: 'none',
            }}
          >
            {t('feed_add_friends')}
          </Link>
        </div>
      ) : (
        <>
          {logs.map((log) => (
            <WorkoutCard
              key={log.id}
              log={log}
              onCommentAdded={handleCommentAdded}
              onLikeToggled={handleLikeToggled}
            />
          ))}

          {/* Sentinel element for infinite scroll */}
          <div ref={sentinelRef} style={{ height: 1 }} />

          {loadingMore && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div
                style={{
                  display: 'inline-block',
                  width: 24,
                  height: 24,
                  border: '3px solid var(--border)',
                  borderTopColor: '#6366F1',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {!hasMore && logs.length > 0 && (
            <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: 13 }}>
              {t('feed_no_more')}
            </div>
          )}
        </>
      )}

      {/* Floating action button - link to log a workout */}
      <Link
        href="/gym/log"
        aria-label={t('feed_log_workout')}
        style={{
          position: 'fixed',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
          right: 20,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: '#6366F1',
          border: 'none',
          boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 50,
          textDecoration: 'none',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        title={t('feed_log_workout')}
      >
        <Plus style={{ width: 28, height: 28, color: 'white' }} />
      </Link>
    </div>
  );
}
