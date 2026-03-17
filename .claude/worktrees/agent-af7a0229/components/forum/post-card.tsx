'use client';

import { useRouter } from 'next/navigation';
import { Heart, MessageCircle, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

const CATEGORY_LABELS: Record<string, string> = {
  general: 'Ogólne',
  training: 'Trening',
  nutrition: 'Żywienie',
  gear: 'Sprzęt',
  'race-report': 'Race Report',
  question: 'Pytanie',
};

const CATEGORY_COLORS: Record<string, string> = {
  general: 'bg-[#2A2A2A] text-[#888888]',
  training: 'bg-[rgba(124,58,237,0.15)] text-[#7C3AED]',
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

  const preview =
    post.content.length > 150 ? post.content.slice(0, 150) + '...' : post.content;

  const timeAgo = formatDistanceToNow(new Date(post.createdAt), {
    addSuffix: true,
    locale: pl,
  });

  const categoryLabel = CATEGORY_LABELS[post.category] ?? post.category;
  const categoryColor = CATEGORY_COLORS[post.category] ?? 'bg-[#2A2A2A] text-[#888888]';

  return (
    <div
      onClick={() => router.push(`/forum/${post.id}`)}
      className="bg-[var(--bg-card)] border border-[var(--border)] hover:border-[#7C3AED]/50 p-5 cursor-pointer transition-all duration-150 group"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] overflow-hidden flex items-center justify-center shrink-0">
          {post.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.avatarUrl} alt={post.username ?? 'avatar'} className="w-full h-full object-cover" />
          ) : (
            <User className="w-4 h-4 text-[#555]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-white">
            {post.username ?? 'Użytkownik'}
          </span>
          <span className="text-xs text-[#555555] ml-2">{timeAgo}</span>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 ${categoryColor}`}>
          {categoryLabel}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-base font-bold text-white mb-2 group-hover:text-[#7C3AED] transition-colors">
        {post.title}
      </h3>

      {/* Preview */}
      <p className="text-sm text-[#777777] leading-relaxed mb-4">{preview}</p>

      {/* Footer */}
      <div className="flex items-center gap-4 text-xs text-[#555555]">
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
