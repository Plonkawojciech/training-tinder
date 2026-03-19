'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  User,
  Loader2,
  Trash2,
  Send,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pl, enUS } from 'date-fns/locale';
import { useSafeUser } from '@/lib/auth';
import { useLang, type TKey } from '@/lib/lang';

const CATEGORY_KEYS: Record<string, TKey> = {
  general: 'forum_general',
  training: 'forum_training',
  nutrition: 'forum_nutrition',
  gear: 'forum_gear',
  'race-report': 'forum_race_report',
  question: 'forum_questions',
};

const CATEGORY_COLORS: Record<string, string> = {
  general: 'bg-[var(--border)] text-[var(--text-muted)]',
  training: 'bg-[rgba(99,102,241,0.15)] text-[#6366F1]',
  nutrition: 'bg-[rgba(34,197,94,0.15)] text-green-500',
  gear: 'bg-[rgba(59,130,246,0.15)] text-blue-400',
  'race-report': 'bg-[rgba(168,85,247,0.15)] text-purple-400',
  question: 'bg-[rgba(234,179,8,0.15)] text-yellow-500',
};

interface Post {
  id: number;
  userId: string;
  title: string;
  content: string;
  category: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  username?: string | null;
  avatarUrl?: string | null;
}

interface Comment {
  id: number;
  postId: number;
  userId: string;
  content: string;
  likesCount: number;
  createdAt: string;
  username?: string | null;
  avatarUrl?: string | null;
}

export default function ForumPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const currentUser = useSafeUser();
  const { t, lang } = useLang();

  const dateFnsLocale = lang === 'pl' ? pl : enUS;

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function loadPost() {
      setLoading(true);
      try {
        const res = await fetch(`/api/forum/posts/${id}`);
        if (!res.ok) {
          setError(t('forum_not_found'));
          return;
        }
        const data = await res.json();
        setPost(data.post);
        setComments(data.comments);
        setIsLiked(data.isLiked);
      } catch {
        setError(t('forum_not_found'));
      } finally {
        setLoading(false);
      }
    }
    loadPost();
  }, [id, t]);

  async function handleLike() {
    if (!post || likeLoading) return;
    setLikeLoading(true);
    try {
      const res = await fetch(`/api/forum/posts/${id}/like`, { method: 'POST' });
      if (!res.ok) return;
      const data = await res.json();
      setIsLiked(data.liked);
      setPost((prev) => prev ? { ...prev, likesCount: data.likesCount } : prev);
    } catch {
      console.error('Like failed');
    } finally {
      setLikeLoading(false);
    }
  }

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/forum/posts/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText }),
      });
      if (!res.ok) return;
      const newComment = await res.json();
      setComments((prev) => [...prev, newComment]);
      setPost((prev) => prev ? { ...prev, commentsCount: prev.commentsCount + 1 } : prev);
      setCommentText('');
    } catch {
      console.error('Comment failed');
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleDelete() {
    if (!post || deleting) return;
    if (!confirm(t('forum_delete_confirm'))) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/forum/posts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/forum');
      }
    } catch {
      console.error('Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#6366F1]" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center gap-4">
        <p className="text-[var(--text-dim)]">{error || t('forum_not_found')}</p>
        <button
          onClick={() => router.push('/forum')}
          className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('forum_back')}
        </button>
      </div>
    );
  }

  const categoryKey = CATEGORY_KEYS[post.category];
  const categoryLabel = categoryKey ? t(categoryKey) : post.category;
  const categoryColor = CATEGORY_COLORS[post.category] ?? 'bg-[var(--border)] text-[var(--text-muted)]';
  const isOwner = currentUser.id === post.userId;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Back button */}
        <button
          onClick={() => router.push('/forum')}
          className="flex items-center gap-2 text-sm text-[var(--text-dim)] hover:text-[var(--text)] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('forum_back')}
        </button>

        {/* Post */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] p-6 mb-4">
          {/* Author */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] overflow-hidden flex items-center justify-center shrink-0">
              {post.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.avatarUrl} alt={post.username ?? 'avatar'} className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-[var(--text-dim)]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[var(--text)]">{post.username ?? t('gen_user')}</p>
              <p className="text-xs text-[var(--text-dim)]">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: dateFnsLocale })}
              </p>
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 ${categoryColor}`}>
              {categoryLabel}
            </span>
            {isOwner && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-[var(--text-dim)] hover:text-red-500 transition-colors p-1"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            )}
          </div>

          {/* Title */}
          <h1 className="text-xl font-black uppercase tracking-wider mb-3">{post.title}</h1>

          {/* Content */}
          <p className="text-sm text-[var(--text-muted)] leading-relaxed whitespace-pre-wrap">{post.content}</p>

          {/* Actions */}
          <div className="flex items-center gap-4 mt-5 pt-4 border-t border-[var(--border)]">
            <button
              onClick={handleLike}
              disabled={likeLoading}
              className={`flex items-center gap-2 text-sm transition-colors ${
                isLiked ? 'text-[#6366F1]' : 'text-[var(--text-dim)] hover:text-[#6366F1]'
              } disabled:opacity-50`}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              <span className="font-medium">{post.likesCount}</span>
            </button>
            <span className="flex items-center gap-2 text-sm text-[var(--text-dim)]">
              <MessageCircle className="w-5 h-5" />
              <span>{post.commentsCount}</span>
            </span>
          </div>
        </div>

        {/* Comments section */}
        <div className="mb-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--text-dim)] mb-3">
            {t('forum_comments')} ({comments.length})
          </h2>

          <div className="flex flex-col gap-3 mb-4">
            {comments.length === 0 ? (
              <p className="text-sm text-[var(--text-dim)] py-4 text-center">
                {t('forum_no_comments')}
              </p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="bg-[var(--bg-card)] border border-[var(--border)] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] overflow-hidden flex items-center justify-center shrink-0">
                      {comment.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={comment.avatarUrl}
                          alt={comment.username ?? 'avatar'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-3.5 h-3.5 text-[var(--text-dim)]" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-[var(--text)]">
                      {comment.username ?? t('gen_user')}
                    </span>
                    <span className="text-xs text-[var(--text-dim)]">
                      {formatDistanceToNow(new Date(comment.createdAt), {
                        addSuffix: true,
                        locale: dateFnsLocale,
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed">{comment.content}</p>
                </div>
              ))
            )}
          </div>

          {/* Comment form */}
          <form onSubmit={handleSubmitComment} className="flex gap-3">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={t('forum_comment_placeholder')}
              rows={3}
              className="flex-1 bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text)] placeholder-[var(--text-dim)] px-4 py-3 text-sm focus:outline-none focus:border-[#6366F1]/50 transition-colors resize-none"
            />
            <button
              type="submit"
              disabled={submittingComment || !commentText.trim()}
              className="px-4 py-3 bg-[#6366F1] text-white hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all disabled:opacity-50 flex items-center justify-center self-stretch"
            >
              {submittingComment ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
