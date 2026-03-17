'use client';

import { useState } from 'react';
import { Dumbbell, Trophy, Users, BookOpen, Award, UserPlus, UserMinus } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

interface ActivityCardProps {
  id: number;
  type: string;
  dataJson: Record<string, unknown>;
  createdAt: string;
  creator: { username: string | null; avatarUrl: string | null; clerkId: string } | null;
  isOwn: boolean;
  isFollowing: boolean;
  onFollowToggle: (targetId: string, following: boolean) => void;
}

function ActivityIcon({ type }: { type: string }) {
  const iconProps = { className: 'w-4 h-4' };
  switch (type) {
    case 'workout_completed':
      return <Dumbbell {...iconProps} />;
    case 'pr_set':
      return <Trophy {...iconProps} />;
    case 'session_joined':
      return <Users {...iconProps} />;
    case 'plan_shared':
      return <BookOpen {...iconProps} />;
    case 'achievement':
      return <Award {...iconProps} />;
    default:
      return <Dumbbell {...iconProps} />;
  }
}

const TYPE_COLORS: Record<string, string> = {
  workout_completed: '#6366F1',
  pr_set: '#FFD700',
  session_joined: '#00D4FF',
  plan_shared: '#00CC44',
  achievement: '#CC44FF',
};

function ActivityContent({ type, data }: { type: string; data: Record<string, unknown> }) {
  switch (type) {
    case 'workout_completed':
      return (
        <div>
          <p className="text-sm text-white">
            Ukończono <span className="text-[#6366F1] font-semibold">{String(data.workoutName ?? 'trening')}</span>
          </p>
          <p className="text-xs text-[#888888] mt-1">
            {String(data.type ?? '').toUpperCase()} · {String(data.exerciseCount ?? 0)} ćwiczeń
            {data.durationMin ? ` · ${data.durationMin}min` : ''}
          </p>
        </div>
      );
    case 'pr_set':
      return (
        <div>
          <p className="text-sm text-white">
            Nowy rekord w <span className="text-[#FFD700] font-semibold">{String(data.exerciseName ?? '')}</span>
          </p>
          <p className="text-xs text-[#888888] mt-1">
            {String(data.weightKg ?? 0)}kg × {String(data.reps ?? 0)} powt.
          </p>
        </div>
      );
    case 'session_joined':
      return (
        <p className="text-sm text-white">
          Dołączono do sesji treningowej
        </p>
      );
    case 'plan_shared':
      return (
        <div>
          <p className="text-sm text-white">
            Udostępniono plan: <span className="text-[#00CC44] font-semibold">{String(data.planTitle ?? '')}</span>
          </p>
        </div>
      );
    case 'achievement':
      return (
        <div>
          <p className="text-sm text-white">
            Odblokowano osiągnięcie: <span className="text-[#CC44FF] font-semibold">{String(data.title ?? '')}</span>
          </p>
          <p className="text-xs text-[#888888] mt-1">{String(data.description ?? '')}</p>
        </div>
      );
    default:
      return <p className="text-sm text-[#888888]">Aktywność zapisana</p>;
  }
}

export function ActivityCard({
  type,
  dataJson,
  createdAt,
  creator,
  isOwn,
  isFollowing,
  onFollowToggle,
}: ActivityCardProps) {
  const color = TYPE_COLORS[type] ?? '#888888';
  const [followLoading, setFollowLoading] = useState(false);
  const [localFollowing, setLocalFollowing] = useState(isFollowing);

  async function handleFollow() {
    if (!creator || isOwn) return;
    setFollowLoading(true);
    try {
      const res = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: creator.clerkId }),
      });
      if (res.ok) {
        const data = await res.json() as { following: boolean };
        setLocalFollowing(data.following);
        onFollowToggle(creator.clerkId, data.following);
      }
    } finally {
      setFollowLoading(false);
    }
  }

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] p-4 hover:border-[#6366F1]/50 transition-all">
      <div className="flex items-start gap-3">
        {/* Activity type icon */}
        <div
          className="w-8 h-8 flex items-center justify-center shrink-0"
          style={{ background: `${color}20`, border: `1px solid ${color}40`, color }}
        >
          <ActivityIcon type={type} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Creator row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 flex items-center justify-center text-[10px] font-bold text-white"
                style={{ background: '#6366F1' }}
              >
                {(creator?.username ?? '?')[0].toUpperCase()}
              </div>
              <span className="text-xs font-semibold text-white">
                {creator?.username ?? 'Nieznany'}
              </span>
              {isOwn && (
                <span className="text-[9px] text-[#555555] uppercase tracking-wider">Ty</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!isOwn && creator && (
                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  className="flex items-center gap-1 text-[10px] px-2 py-1 border transition-all"
                  style={
                    localFollowing
                      ? { borderColor: '#2A2A2A', color: '#888888' }
                      : { borderColor: '#6366F1', color: '#6366F1', background: 'rgba(99,102,241,0.08)' }
                  }
                >
                  {localFollowing ? (
                    <><UserMinus className="w-3 h-3" /> Obserwujesz</>
                  ) : (
                    <><UserPlus className="w-3 h-3" /> Obserwuj</>
                  )}
                </button>
              )}
              <span className="text-[10px] text-[#555555]">{formatRelativeTime(createdAt)}</span>
            </div>
          </div>

          <ActivityContent type={type} data={dataJson} />
        </div>
      </div>
    </div>
  );
}
