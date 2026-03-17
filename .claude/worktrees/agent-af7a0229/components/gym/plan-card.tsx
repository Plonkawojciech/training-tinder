'use client';

import { Calendar, ChevronRight } from 'lucide-react';
import { getSportLabel, getSportColor } from '@/lib/utils';
import Link from 'next/link';

interface PlanCardProps {
  id: number;
  title: string;
  description?: string | null;
  sportType: string;
  difficulty: string;
  durationWeeks: number;
  creator?: { username: string | null; avatarUrl: string | null } | null;
  isOwn?: boolean;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: '#00CC44',
  intermediate: '#FFD700',
  advanced: '#A78BFA',
  elite: '#7C3AED',
};

export function PlanCard({
  id,
  title,
  description,
  sportType,
  difficulty,
  durationWeeks,
  creator,
  isOwn,
}: PlanCardProps) {
  const sportColor = getSportColor(sportType);
  const diffColor = DIFFICULTY_COLORS[difficulty] ?? '#888888';

  return (
    <Link href={`/gym/plans/${id}`}>
      <div className="bg-[var(--bg-card)] border border-[var(--border)] p-4 hover:border-[#7C3AED] transition-all group">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <p className="font-semibold text-white text-sm group-hover:text-[#7C3AED] transition-colors">
              {title}
            </p>
            {description && (
              <p className="text-xs text-[#888888] mt-1 line-clamp-2">{description}</p>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-[#555555] group-hover:text-[#7C3AED] transition-colors shrink-0 ml-2" />
        </div>

        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span
            className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 font-bold"
            style={{ color: sportColor, background: `${sportColor}20`, border: `1px solid ${sportColor}40` }}
          >
            {getSportLabel(sportType)}
          </span>
          <span
            className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 font-bold"
            style={{ color: diffColor, background: `${diffColor}20`, border: `1px solid ${diffColor}40` }}
          >
            {difficulty}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-[#888888]">
            <Calendar className="w-3 h-3" />
            <span>{durationWeeks} week{durationWeeks !== 1 ? 's' : ''}</span>
          </div>
          {creator && (
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-[#7C3AED] flex items-center justify-center text-[8px] font-bold text-white">
                {(creator.username ?? '?')[0].toUpperCase()}
              </div>
              <span className="text-xs text-[#555555]">{creator.username ?? 'Unknown'}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
