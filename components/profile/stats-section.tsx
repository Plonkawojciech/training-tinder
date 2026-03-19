'use client';

import { useEffect, useState } from 'react';
import { Dumbbell, Trophy, Flame } from 'lucide-react';
import { useLang } from '@/lib/lang';

interface StatsSummary {
  totalWorkouts: number;
  weekWorkouts: number;
  monthWorkouts: number;
  monthPRs: number;
  totalSets: number;
  totalPRs: number;
}

export function ProfileStatsSection() {
  const { t } = useLang();
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats?type=summary')
      .then((r) => r.json())
      .then((data: StatsSummary) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border)] p-6 mb-4">
        <div className="h-20 skeleton" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] p-6 mb-4">
      <h3 className="font-display text-sm text-[#888888] tracking-wider mb-4">{t('profile_stats_heading')}</h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="w-10 h-10 bg-[rgba(99,102,241,0.1)] border border-[rgba(99,102,241,0.2)] flex items-center justify-center mx-auto mb-2">
            <Dumbbell className="w-5 h-5 text-[#6366F1]" />
          </div>
          <p className="font-display text-2xl text-white">{stats.monthWorkouts}</p>
          <p className="text-xs text-[#888888]">{t('profile_stats_this_month')}</p>
        </div>
        <div className="text-center">
          <div className="w-10 h-10 bg-[rgba(255,215,0,0.1)] border border-[rgba(255,215,0,0.2)] flex items-center justify-center mx-auto mb-2">
            <Trophy className="w-5 h-5 text-[#FFD700]" />
          </div>
          <p className="font-display text-2xl text-white">{stats.totalPRs}</p>
          <p className="text-xs text-[#888888]">{t('profile_stats_total_prs')}</p>
        </div>
        <div className="text-center">
          <div className="w-10 h-10 bg-[rgba(99,102,241,0.1)] border border-[rgba(99,102,241,0.2)] flex items-center justify-center mx-auto mb-2">
            <Flame className="w-5 h-5 text-[#A78BFA]" />
          </div>
          <p className="font-display text-2xl text-white">{stats.weekWorkouts}</p>
          <p className="text-xs text-[#888888]">{t('profile_stats_this_week')}</p>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-[var(--border)] flex justify-between text-xs text-[#888888]">
        <span>{t('profile_stats_total_workouts', { n: String(stats.totalWorkouts) })}</span>
        <span>{t('profile_stats_sets_month', { n: String(stats.totalSets) })}</span>
      </div>
    </div>
  );
}
