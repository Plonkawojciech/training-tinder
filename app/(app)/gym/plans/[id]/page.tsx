'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Target, User, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StrengthBadge } from '@/components/gym/strength-badge';
import { getSportLabel, getSportColor } from '@/lib/utils';
import { useLang } from '@/lib/lang';

interface PlanWeek {
  id: number;
  planId: number;
  weekNumber: number;
  daysJson: Record<string, unknown>;
  notes: string | null;
}

interface Plan {
  id: number;
  title: string;
  description: string | null;
  sportType: string;
  difficulty: string;
  durationWeeks: number;
  isPublic: boolean;
  createdAt: string;
  creatorId: string;
  weeks: PlanWeek[];
  creator: { username: string | null; avatarUrl: string | null; authEmail: string } | null;
}

export default function PlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useLang();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [following, setFollowing] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    fetch(`/api/plans/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: Plan) => setPlan(data))
      .catch(() => router.push('/gym/plans'))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <div className="h-64 skeleton" />
      </div>
    );
  }

  if (!plan) return null;

  const sportColor = getSportColor(plan.sportType);

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayLabels: Record<string, string> = {
    Monday: t('gym_plan_day_mon'), Tuesday: t('gym_plan_day_tue'), Wednesday: t('gym_plan_day_wed'),
    Thursday: t('gym_plan_day_thu'), Friday: t('gym_plan_day_fri'), Saturday: t('gym_plan_day_sat'), Sunday: t('gym_plan_day_sun'),
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-[#888888] hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('gym_plan_back')}
      </button>

      {/* Plan header */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span
                className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 font-bold"
                style={{ color: sportColor, background: `${sportColor}20`, border: `1px solid ${sportColor}40` }}
              >
                {getSportLabel(plan.sportType)}
              </span>
              <StrengthBadge level={plan.difficulty} size="sm" />
            </div>
            <h1 className="font-display text-3xl text-white tracking-wider mb-2">{plan.title}</h1>
            {plan.description && (
              <p className="text-[#888888] text-sm leading-relaxed">{plan.description}</p>
            )}
          </div>
          <Button
            onClick={() => setFollowing((f) => !f)}
            variant={following ? 'outline' : 'default'}
            size="sm"
          >
            {following ? t('gym_plan_following') : t('gym_plan_follow')}
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4 border-t border-[var(--border)] pt-4">
          <div className="flex items-center gap-2 text-sm text-[#888888]">
            <Calendar className="w-4 h-4 text-[#6366F1]" />
            <span>{plan.durationWeeks} {t('gym_week_short')}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#888888]">
            <Target className="w-4 h-4 text-[#6366F1]" />
            <span>{plan.weeks.length} {t('gym_weeks')}</span>
          </div>
          {plan.creator && (
            <div className="flex items-center gap-2 text-sm text-[#888888]">
              <User className="w-4 h-4 text-[#6366F1]" />
              <span>{plan.creator.username ?? 'Nieznany'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Weekly breakdown */}
      <div className="mb-6">
        <h2 className="font-display text-sm text-[#888888] tracking-wider mb-3">{t('gym_plan_weekly')}</h2>

        {plan.weeks.length === 0 ? (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] p-6 text-center">
            <p className="text-[#888888] text-sm">
              {t('gym_plan_no_weekly')}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {plan.weeks.map((week) => (
              <div key={week.id} className="bg-[var(--bg-card)] border border-[var(--border)]">
                <button
                  onClick={() => setExpandedWeek(expandedWeek === week.weekNumber ? null : week.weekNumber)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <div>
                    <span className="font-semibold text-white text-sm">{t('gym_plan_week_n')} {week.weekNumber}</span>
                    {week.notes && (
                      <span className="text-xs text-[#888888] ml-3">{week.notes}</span>
                    )}
                  </div>
                  {expandedWeek === week.weekNumber ? (
                    <ChevronUp className="w-4 h-4 text-[#888888]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#888888]" />
                  )}
                </button>

                {expandedWeek === week.weekNumber && (
                  <div className="border-t border-[var(--border)] p-4">
                    {!week.daysJson || Object.keys(week.daysJson).length === 0 ? (
                      <p className="text-xs text-[#555555]">{t('gym_plan_no_daily')}</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {dayNames.map((day) => {
                          const dayData = week.daysJson[day.toLowerCase()];
                          if (!dayData) return null;
                          return (
                            <div key={day} className="p-3 bg-[var(--bg-card)] border border-[var(--border)]">
                              <p className="text-xs font-bold text-[#6366F1] uppercase tracking-wider mb-1">{dayLabels[day] ?? day}</p>
                              <p className="text-xs text-[#888888] whitespace-pre-wrap">
                                {typeof dayData === 'string' ? dayData : JSON.stringify(dayData, null, 2)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review section */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] p-6">
        <h2 className="font-display text-sm text-[#888888] tracking-wider mb-4">NAPISZ OPINIĘ</h2>

        <div className="mb-4">
          <div className="flex items-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setReviewRating(star)}
                className="transition-colors"
              >
                <Star
                  className="w-6 h-6"
                  fill={star <= reviewRating ? '#FFD700' : 'transparent'}
                  stroke={star <= reviewRating ? '#FFD700' : '#2A2A2A'}
                />
              </button>
            ))}
          </div>
          <textarea
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            placeholder="Podziel się swoją opinią o tym planie..."
            className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2.5 text-sm focus:border-[#6366F1] focus:outline-none resize-none h-20 placeholder:text-[#444444]"
          />
        </div>

        <Button
          size="sm"
          disabled={reviewRating === 0 || submittingReview}
          onClick={async () => {
            if (reviewRating === 0) return;
            setSubmittingReview(true);
            try {
              await fetch(`/api/plans/${plan.id}/review`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
              });
              setReviewRating(0);
              setReviewComment('');
            } finally {
              setSubmittingReview(false);
            }
          }}
        >
          <Star className="w-4 h-4" />
          {t('review_submit')}
        </Button>
      </div>
    </div>
  );
}
