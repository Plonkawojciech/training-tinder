'use client';

import { Clock, Dumbbell, User } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

interface WorkoutCardProps {
  id: number;
  name: string;
  type: string;
  durationMin?: number | null;
  exerciseCount: number;
  date: string;
  creator?: { username: string | null; avatarUrl: string | null } | null;
  isOwn?: boolean;
  onClick?: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  push: '#7C3AED',
  pull: '#00D4FF',
  legs: '#00CC44',
  fullbody: '#FFD700',
  upper: '#A78BFA',
  lower: '#CC44FF',
  custom: '#888888',
};

export function WorkoutCard({
  name,
  type,
  durationMin,
  exerciseCount,
  date,
  creator,
  isOwn,
  onClick,
}: WorkoutCardProps) {
  const color = TYPE_COLORS[type] ?? '#888888';

  return (
    <div
      className="bg-[var(--bg-card)] border border-[var(--border)] p-4 hover:border-[#7C3AED] transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-white text-sm">{name}</p>
          <span
            className="text-[10px] uppercase tracking-wider font-bold mt-1 inline-block px-1.5 py-0.5"
            style={{ color, background: `${color}20`, border: `1px solid ${color}40` }}
          >
            {type}
          </span>
        </div>
        {isOwn && (
          <span className="text-[10px] text-[#555555] uppercase tracking-wider">You</span>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs text-[#888888]">
        <div className="flex items-center gap-1">
          <Dumbbell className="w-3 h-3" />
          <span>{exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}</span>
        </div>
        {durationMin && (
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{durationMin}min</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border)]">
        {creator && !isOwn ? (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-[#7C3AED] flex items-center justify-center text-[9px] font-bold text-white">
              {(creator.username ?? '?')[0].toUpperCase()}
            </div>
            <span className="text-xs text-[#888888]">{creator.username ?? 'Unknown'}</span>
          </div>
        ) : (
          <div />
        )}
        <span className="text-xs text-[#555555]">{formatRelativeTime(date)}</span>
      </div>
    </div>
  );
}
