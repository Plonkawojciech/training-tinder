'use client';

import { useRouter } from 'next/navigation';
import { Heart, MessageCircle, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { enUS } from 'date-fns/locale';
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
  general: 'bg-[#2A2A2A] text-[var(--text-muted)]',
  training: 'bg-[rgba(99,102,241,0.15)] text-[#6366F1]',
  nutrition: 'bg-[rgba(34,197,94,0.15)] text-green-500',
  gear: 'bg-[rgba(59,130,246,0.15)] text-blue-400',
  'race-report': 'bg-[rgba(168,85,247,0.15)] text-purple-400',
  question: 'bg-[rgba(234,179,8,0.15)] text-yellow-500',
};

interface PostCardProps {
  post: {
    id: number;
    userId: string;
    title: string;
    content: string;
    category: string;
    imageUrl?: string | null;
    likesCount: number;
    commentsCount: number;
    createdAt: string | Date;
    username?: string | null;
    avatarUrl?: string | null;
  };
}

export function PostCard({ post }: PostCardProps) {
  const router = useRouter();
  const { t, lang } = useLang();

  const preview =
    post.content.length > 150 ? post.content.slice(0, 150) + '...' : post.content;

  const timeAgo = formatDistanceToNow(new Date(post.createdAt), {
    addSuffix: true,
    locale: lang === 'pl' ? pl : enUS,
  });

  const categoryKey = CATEGORY_KEYS[post.category];
  const categoryLabel = categoryKey ? t(categoryKey) : post.category;
  const categoryColor = CATEGORY_COLORS[post.category] ?? 'bg-[#2A2A2A] text-[var(--text-muted)]';

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/forum/${post.id}`)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/forum/${post.id}`); } }}
      className="bg-[var(--bg-card)] border border-[var(--border)] hover:border-[#6366F1]/50 p-5 cursor-pointer transition-all duration-150 group"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] overflow-hidden flex items-center justify-center shrink-0">
          {post.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.avatarUrl} alt={post.username ?? 'avatar'} className="w-full h-full object-cover" />
          ) : (
            <User className="w-4 h-4 text-[var(--text-dim)]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-[var(--text)]">
            {post.username ?? t('gen_user')}
          </span>
          <span className="text-xs text-[var(--text-dim)] ml-2">{timeAgo}</span>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 ${categoryColor}`}>
          {categoryLabel}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-base font-bold text-[var(--text)] mb-2 group-hover:text-[#6366F1] transition-colors">
        {post.title}
      </h3>

      {/* Preview */}
      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">{preview}</p>

      {/* Footer */}
      <div className="flex items-center gap-4 text-xs text-[var(--text-dim)]">
        <span className="flex items-center gap-1.5">
          <Heart className="w-3.5 h-3.5" />
          <span>{post.likesCount}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <MessageCircle className="w-3.5 h-3.5" />
          <span>{post.commentsCount}</span>
        </span>
      </div>
    </div>
  );
}
