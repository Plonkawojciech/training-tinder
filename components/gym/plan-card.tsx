'use client';

import { Calendar, ChevronRight } from 'lucide-react';
import { getSportLabel, getSportColor } from '@/lib/utils';
import Link from 'next/link';
import { useLang } from '@/lib/lang';

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
  elite: '#6366F1',
};

// DIFFICULTY_LABELS replaced by t() calls below

export function PlanCard({
  id,
  title,
  description,
  sportType,
  difficulty,
  durationWeeks,
  creator,
  isOwn: _isOwn,
}: PlanCardProps) {
  const { t } = useLang();
  const DIFFICULTY_LABELS: Record<string, string> = {
    beginner: t('nsess_level_beginner'),
    intermediate: t('nsess_level_intermediate'),
    advanced: t('nsess_level_advanced'),
    elite: t('nsess_level_elite'),
  };
  const sportColor = getSportColor(sportType);
  const diffColor = DIFFICULTY_COLORS[difficulty] ?? '#888888';

  return (
    <Link href={`/gym/plans/${id}`}>
      <div className="bg-[var(--bg-card)] border border-[var(--border)] p-4 hover:border-[#6366F1] transition-all group">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <p className="font-semibold text-white text-sm group-hover:text-[#6366F1] transition-colors">
              {title}
            </p>
            {description && (
              <p className="text-xs text-[#888888] mt-1 line-clamp-2">{description}</p>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-[#555555] group-hover:text-[#6366F1] transition-colors shrink-0 ml-2" />
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
            {DIFFICULTY_LABELS[difficulty] ?? difficulty}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-[#888888]">
            <Calendar className="w-3 h-3" />
            <span>{durationWeeks} {durationWeeks === 1 ? t('gym_week_short') : t('gym_weeks')}</span>
          </div>
          {creator && (
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-[#6366F1] flex items-center justify-center text-[8px] font-bold text-white">
                {(creator.username ?? '?')[0].toUpperCase()}
              </div>
              <span className="text-xs text-[#555555]">{creator.username ?? 'Nieznany'}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
