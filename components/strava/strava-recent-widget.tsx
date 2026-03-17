'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PersonStanding, Bike, Waves, Footprints, Mountain, Activity, ChevronRight } from 'lucide-react';

interface RecentActivity {
  id: number;
  name: string;
  sportType: string | null;
  distanceM: number | null;
  movingTimeSec: number | null;
  startDate: string;
}

interface StravaStatsData {
  stats: {
    recent_run_totals: { distance: number; count: number };
    recent_ride_totals: { distance: number; count: number };
    recent_swim_totals: { distance: number; count: number };
  } | null;
  recentActivities: RecentActivity[];
  activityCount: number;
}

function getSportConfig(sportType: string | null) {
  const s = (sportType ?? '').toLowerCase();
  if (s.includes('run')) return { icon: PersonStanding, color: '#2DD4BF' };
  if (s.includes('ride') || s.includes('cycling') || s.includes('virtual')) return { icon: Bike, color: '#FC4C02' };
  if (s.includes('swim')) return { icon: Waves, color: '#60A5FA' };
  if (s.includes('walk')) return { icon: Footprints, color: '#4ADE80' };
  if (s.includes('hike') || s.includes('trail')) return { icon: Mountain, color: '#A78BFA' };
  return { icon: Activity, color: '#888888' };
}

function formatDistance(m: number | null): string {
  if (!m) return '';
  return `${(m / 1000).toFixed(1)} km`;
}

function formatRelativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'Dzisiaj';
  if (diff === 1) return 'Wczoraj';
  if (diff < 7) return `${diff}d temu`;
  return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
}

const StravaLogo = () => (
  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white">
    <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
  </svg>
);

interface StravaRecentWidgetProps {
  className?: string;
}

export function StravaRecentWidget({ className = '' }: StravaRecentWidgetProps) {
  const [data, setData] = useState<StravaStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/strava/stats')
      .then(r => r.ok ? r.json() as Promise<StravaStatsData> : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className={`bg-[var(--bg-card)] border border-[var(--border)] rounded-[20px] p-5 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-[#FC4C02] rounded-sm animate-pulse" />
          <div className="h-4 w-24 skeleton" />
        </div>
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map(i => <div key={i} className="h-10 skeleton" />)}
        </div>
      </div>
    );
  }

  // Not connected or no data
  if (!data || (!data.stats && data.recentActivities.length === 0)) {
    return (
      <div className={`bg-[var(--bg-card)] border border-[var(--border)] rounded-[20px] p-5 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 bg-[#FC4C02] rounded-sm flex items-center justify-center">
            <StravaLogo />
          </div>
          <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>Strava</span>
        </div>
        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
          Połącz Stravę, by widzieć aktywności
        </p>
        <a
          href="/api/strava/connect?mode=auth"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white"
          style={{ background: '#FC4C02' }}
        >
          <StravaLogo />
          Połącz Stravę
        </a>
      </div>
    );
  }

  const recentRun = data.stats?.recent_run_totals;
  const recentRide = data.stats?.recent_ride_totals;

  return (
    <div className={`bg-[var(--bg-card)] border border-[var(--border)] rounded-[20px] p-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-[#FC4C02] rounded-sm flex items-center justify-center">
            <StravaLogo />
          </div>
          <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>Strava</span>
        </div>
        <Link
          href="/stats"
          className="flex items-center gap-0.5 text-xs font-semibold"
          style={{ color: '#FC4C02', textDecoration: 'none' }}
        >
          Statystyki <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Last 4 weeks km pills */}
      {data.stats && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {(recentRun?.distance ?? 0) > 0 && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
              style={{ background: 'rgba(45,212,191,0.12)' }}
            >
              <PersonStanding className="w-3 h-3" style={{ color: '#2DD4BF' }} />
              <span className="text-xs font-bold text-white">
                {((recentRun!.distance) / 1000).toFixed(0)} km
              </span>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>bieg</span>
            </div>
          )}
          {(recentRide?.distance ?? 0) > 0 && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
              style={{ background: 'rgba(252,76,2,0.12)' }}
            >
              <Bike className="w-3 h-3" style={{ color: '#FC4C02' }} />
              <span className="text-xs font-bold text-white">
                {((recentRide!.distance) / 1000).toFixed(0)} km
              </span>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>rower</span>
            </div>
          )}
          {data.activityCount > 0 && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
              style={{ background: 'rgba(136,136,136,0.1)' }}
            >
              <Activity className="w-3 h-3" style={{ color: '#888' }} />
              <span className="text-xs font-bold text-white">{data.activityCount}</span>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>aktywności</span>
            </div>
          )}
        </div>
      )}

      {/* Recent activities */}
      {data.recentActivities.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {data.recentActivities.slice(0, 3).map(activity => {
            const { icon: Icon, color } = getSportConfig(activity.sportType);
            return (
              <div key={activity.id} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${color}18` }}
                >
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>
                    {activity.name}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {formatRelativeDate(activity.startDate)}
                  </p>
                </div>
                {activity.distanceM ? (
                  <span className="text-xs font-bold flex-shrink-0" style={{ color: 'var(--text)' }}>
                    {formatDistance(activity.distanceM)}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
