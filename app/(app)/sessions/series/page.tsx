'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Repeat, MapPin, Clock, Users, Plus, Calendar, CheckCircle2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSportColor, getSportLabel } from '@/lib/utils';
import { useLang } from '@/lib/lang';

interface SessionSeries {
  id: number;
  creatorId: string;
  title: string;
  sportType: string;
  dayOfWeek: number;
  time: string;
  frequency: string;
  location: string;
  maxParticipants: number;
  description: string | null;
  minLevel: string | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
}

const DAY_LABEL_KEYS = [
  'series_day_mon', 'series_day_tue', 'series_day_wed', 'series_day_thu',
  'series_day_fri', 'series_day_sat', 'series_day_sun',
] as const;
const FREQ_LABEL_KEYS: Record<string, string> = {
  weekly: 'series_freq_weekly',
  biweekly: 'series_freq_biweekly',
  monthly: 'series_freq_monthly',
};

const LEVEL_COLORS: Record<string, string> = {
  beginner: '#00CC44',
  recreational: '#FFD700',
  competitive: '#A78BFA',
  elite: '#6366F1',
};

function getNextOccurrence(dayOfWeek: number, time: string): Date {
  const jsDayOfWeek = dayOfWeek === 6 ? 0 : dayOfWeek + 1;
  const [h, m] = time.split(':').map(Number);

  const now = new Date();
  const candidate = new Date(now);
  candidate.setHours(h ?? 7, m ?? 0, 0, 0);

  while (candidate.getDay() !== jsDayOfWeek || candidate <= now) {
    candidate.setDate(candidate.getDate() + 1);
  }

  return candidate;
}

function SeriesCard({
  series,
  isOwn,
  onDelete,
}: {
  series: SessionSeries;
  isOwn: boolean;
  onDelete?: (id: number) => void;
}) {
  const { lang, t } = useLang();
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const color = getSportColor(series.sportType);
  const nextOcc = getNextOccurrence(series.dayOfWeek, series.time);

  async function handleJoinToggle() {
    setJoining(true);
    try {
      const method = joined ? 'DELETE' : 'POST';
      const res = await fetch(`/api/session-series/${series.id}/join`, { method });
      if (res.ok) setJoined(!joined);
    } finally {
      setJoining(false);
    }
  }

  async function handleDelete() {
    if (!confirm(t('series_delete_confirm'))) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/session-series/${series.id}`, { method: 'DELETE' });
      if (res.ok) onDelete?.(series.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="border border-[var(--border)] bg-[var(--bg-card)] p-5 flex flex-col gap-4 hover:border-[#3A3A3A] transition-all"
      style={{ borderLeftColor: color, borderLeftWidth: 2 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5"
              style={{ background: `${color}20`, color }}
            >
              {getSportLabel(series.sportType)}
            </span>
            <span className="text-xs text-[#888888]">
              {FREQ_LABEL_KEYS[series.frequency] ? t(FREQ_LABEL_KEYS[series.frequency] as Parameters<typeof t>[0]) : series.frequency}
            </span>
            {series.minLevel && (
              <span
                className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5"
                style={{
                  background: `${LEVEL_COLORS[series.minLevel] ?? '#888'}20`,
                  color: LEVEL_COLORS[series.minLevel] ?? '#888',
                }}
              >
                {series.minLevel}+
              </span>
            )}
          </div>
          <h3 className="text-white font-semibold text-base truncate">{series.title}</h3>
        </div>

        {isOwn && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="text-[#444444] hover:text-red-400 transition-colors flex-shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 flex-wrap text-xs text-[#888888]">
        <span className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          {t(DAY_LABEL_KEYS[series.dayOfWeek] as Parameters<typeof t>[0])}s
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          {series.time}
        </span>
        <span className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" />
          {series.location}
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />
          {t('series_max')} {series.maxParticipants}
        </span>
      </div>

      {/* Next occurrence */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] px-3 py-2 flex items-center gap-2">
        <Repeat className="w-3.5 h-3.5 text-[#6366F1]" />
        <span className="text-xs text-[#888888]">{t('series_next')}</span>
        <span className="text-xs text-white font-medium">
          {nextOcc.toLocaleDateString(lang === 'pl' ? 'pl-PL' : 'en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })} {t('series_at')} {series.time}
        </span>
      </div>

      {series.description && (
        <p className="text-[#888888] text-sm line-clamp-2">{series.description}</p>
      )}

      {/* Join button (not own) */}
      {!isOwn && (
        <button
          type="button"
          onClick={handleJoinToggle}
          disabled={joining}
          className="flex items-center justify-center gap-2 h-9 w-full border text-xs font-semibold uppercase tracking-wider transition-all"
          style={
            joined
              ? { borderColor: '#00CC44', background: 'rgba(0,204,68,0.1)', color: '#00CC44' }
              : { borderColor: '#6366F1', background: 'rgba(99,102,241,0.1)', color: '#6366F1' }
          }
        >
          {joining ? (
            <span>...</span>
          ) : joined ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t('series_joined')}
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              {t('series_join')}
            </>
          )}
        </button>
      )}

      {isOwn && (
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#6366F1]" />
          <span className="text-xs text-[#888888]">{t('series_your')}</span>
        </div>
      )}
    </div>
  );
}

export default function SeriesListPage() {
  const { t } = useLang();
  const router = useRouter();
  const [mySeries, setMySeries] = useState<SessionSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/session-series');
        if (!res.ok) throw new Error('Failed to load');
        const data: SessionSeries[] = await res.json();
        setMySeries(data);
      } catch {
        setError(t('series_load_error'));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleDelete(id: number) {
    setMySeries((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Repeat className="w-6 h-6 text-[#6366F1]" />
          <div>
            <h1 className="font-display text-3xl text-white tracking-wider">{t('series_title')}</h1>
            <p className="text-[#888888] text-sm">{t('series_subtitle')}</p>
          </div>
        </div>
        <Button
          onClick={() => router.push('/sessions/new')}
          size="sm"
        >
          <Plus className="w-3.5 h-3.5" />
          {t('series_new')}
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-48 skeleton" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-red-400 text-sm">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-xs text-[#888888] hover:text-white underline"
          >
            {t('series_retry')}
          </button>
        </div>
      ) : mySeries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 border border-dashed border-[var(--border)]">
          <Repeat className="w-12 h-12 text-[#2A2A2A]" />
          <h3 className="font-display text-xl text-[#888888]">{t('series_none_title')}</h3>
          <p className="text-[#888888] text-sm text-center max-w-sm">
            {t('series_empty')}
          </p>
          <Button onClick={() => router.push('/sessions/new?mode=recurring')}>
            <Plus className="w-4 h-4" />
            {t('series_create_first')}
          </Button>
        </div>
      ) : (
        <div>
          {/* My series */}
          <div className="mb-8">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#888888] mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#6366F1]" />
              {t('series_my')} ({mySeries.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mySeries.map((s) => (
                <SeriesCard
                  key={s.id}
                  series={s}
                  isOwn
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
