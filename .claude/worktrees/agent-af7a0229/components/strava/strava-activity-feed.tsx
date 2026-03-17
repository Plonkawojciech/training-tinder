'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  PersonStanding,
  Bike,
  Waves,
  Footprints,
  Mountain,
  Dumbbell,
  Activity,
  ChevronDown,
  Heart,
  TrendingUp,
  Timer,
  ArrowUp,
} from 'lucide-react';

interface StravaActivity {
  id: number;
  stravaId: string;
  type: string;
  sportType: string | null;
  name: string;
  distanceM: number | null;
  movingTimeSec: number | null;
  elapsedTimeSec: number | null;
  averageSpeedMs: number | null;
  maxSpeedMs: number | null;
  elevationGainM: number | null;
  averageWatts: number | null;
  weightedAvgWatts: number | null;
  averageHeartrate: number | null;
  maxHeartrate: number | null;
  averageCadence: number | null;
  startLat: number | null;
  startLon: number | null;
  isTrainer: boolean | null;
  kudosCount: number | null;
  achievementCount: number | null;
  startDate: string;
  summaryPolyline: string | null;
}

type SportFilter = 'All' | 'Run' | 'Ride' | 'Swim' | 'Walk' | 'Hike';

const SPORT_FILTERS: SportFilter[] = ['All', 'Run', 'Ride', 'Swim', 'Walk', 'Hike'];

function getSportConfig(sportType: string | null | undefined) {
  const s = (sportType ?? '').toLowerCase();
  if (s.includes('run') || s === 'run') {
    return { icon: PersonStanding, color: '#2DD4BF', bg: 'rgba(45,212,191,0.1)', label: 'Run' };
  }
  if (s.includes('ride') || s === 'ride' || s.includes('cycling') || s.includes('virtual')) {
    return { icon: Bike, color: '#FC4C02', bg: 'rgba(252,76,2,0.1)', label: 'Ride' };
  }
  if (s.includes('swim')) {
    return { icon: Waves, color: '#60A5FA', bg: 'rgba(96,165,250,0.1)', label: 'Swim' };
  }
  if (s.includes('walk')) {
    return { icon: Footprints, color: '#4ADE80', bg: 'rgba(74,222,128,0.1)', label: 'Walk' };
  }
  if (s.includes('hike') || s.includes('trail')) {
    return { icon: Mountain, color: '#A78BFA', bg: 'rgba(167,139,250,0.1)', label: 'Hike' };
  }
  if (s.includes('weight') || s.includes('strength') || s.includes('cross')) {
    return { icon: Dumbbell, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', label: 'Workout' };
  }
  return { icon: Activity, color: '#888888', bg: 'rgba(136,136,136,0.1)', label: sportType ?? 'Activity' };
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatPace(speedMs: number | null): string {
  if (!speedMs || speedMs <= 0) return '—';
  const secPerKm = 1000 / speedMs;
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${min}:${String(sec).padStart(2, '0')} /km`;
}

function formatSpeed(speedMs: number | null): string {
  if (!speedMs) return '—';
  return `${(speedMs * 3.6).toFixed(1)} km/h`;
}

function formatDistance(distanceM: number | null): string {
  if (!distanceM) return '—';
  if (distanceM < 1000) return `${Math.round(distanceM)}m`;
  return `${(distanceM / 1000).toFixed(2)} km`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function ActivityCard({ activity }: { activity: StravaActivity }) {
  const sport = getSportConfig(activity.sportType);
  const SportIcon = sport.icon;
  const isRun = (activity.sportType ?? '').toLowerCase().includes('run');
  const isRide = (activity.sportType ?? '').toLowerCase().includes('ride') ||
    (activity.sportType ?? '').toLowerCase().includes('cycling');

  return (
    <div
      className="flex flex-col gap-3 p-4 border border-[var(--border)] bg-[var(--bg-card)] transition-colors hover:border-[#3A3A3A]"
      style={{ borderLeft: `3px solid ${sport.color}` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full"
            style={{ backgroundColor: sport.bg }}
          >
            <SportIcon className="w-4 h-4" style={{ color: sport.color }} />
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate">{activity.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-sm"
                style={{ backgroundColor: sport.bg, color: sport.color }}>
                {sport.label}
              </span>
              {activity.isTrainer && (
                <span className="text-[10px] text-[#888888] border border-[#3A3A3A] px-1.5 py-0.5 rounded-sm">
                  Indoor
                </span>
              )}
            </div>
          </div>
        </div>
        <span className="text-xs text-[#888888] flex-shrink-0">{formatDate(activity.startDate)}</span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Distance */}
        <div>
          <p className="text-xs text-[#888888] uppercase tracking-wider mb-0.5">Distance</p>
          <p className="text-white font-bold text-base">{formatDistance(activity.distanceM)}</p>
        </div>

        {/* Time */}
        <div>
          <div className="flex items-center gap-1 mb-0.5">
            <Timer className="w-3 h-3 text-[#888888]" />
            <p className="text-xs text-[#888888] uppercase tracking-wider">Time</p>
          </div>
          <p className="text-white font-bold text-base">{formatDuration(activity.movingTimeSec)}</p>
        </div>

        {/* Pace/Speed */}
        <div>
          <div className="flex items-center gap-1 mb-0.5">
            <TrendingUp className="w-3 h-3 text-[#888888]" />
            <p className="text-xs text-[#888888] uppercase tracking-wider">{isRun ? 'Pace' : 'Speed'}</p>
          </div>
          <p className="text-white font-bold text-base">
            {isRun ? formatPace(activity.averageSpeedMs) : formatSpeed(activity.averageSpeedMs)}
          </p>
        </div>

        {/* Elevation */}
        {(activity.elevationGainM ?? 0) > 0 && (
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <ArrowUp className="w-3 h-3 text-[#888888]" />
              <p className="text-xs text-[#888888] uppercase tracking-wider">Elev.</p>
            </div>
            <p className="text-white font-semibold text-sm">
              {Math.round(activity.elevationGainM!)}m
            </p>
          </div>
        )}

        {/* HR */}
        {activity.averageHeartrate && (
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <Heart className="w-3 h-3 text-rose-400" />
              <p className="text-xs text-[#888888] uppercase tracking-wider">Avg HR</p>
            </div>
            <p className="text-white font-semibold text-sm">
              {Math.round(activity.averageHeartrate)} bpm
            </p>
          </div>
        )}

        {/* Watts (cycling) */}
        {isRide && activity.averageWatts && (
          <div>
            <p className="text-xs text-[#888888] uppercase tracking-wider mb-0.5">Power</p>
            <p className="text-white font-semibold text-sm">
              {Math.round(activity.averageWatts)}w
            </p>
          </div>
        )}

        {/* Cadence */}
        {activity.averageCadence && (
          <div>
            <p className="text-xs text-[#888888] uppercase tracking-wider mb-0.5">Cadence</p>
            <p className="text-white font-semibold text-sm">
              {Math.round(activity.averageCadence)} rpm
            </p>
          </div>
        )}
      </div>

      {/* Kudos / achievements */}
      {((activity.kudosCount ?? 0) > 0 || (activity.achievementCount ?? 0) > 0) && (
        <div className="flex items-center gap-3 pt-2 border-t border-[var(--border)]">
          {(activity.kudosCount ?? 0) > 0 && (
            <span className="text-xs text-[#888888]">
              <span className="text-[#FC4C02]">♥</span> {activity.kudosCount} kudos
            </span>
          )}
          {(activity.achievementCount ?? 0) > 0 && (
            <span className="text-xs text-[#888888]">
              <span className="text-yellow-400">★</span> {activity.achievementCount} achievements
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface StravaActivityFeedProps {
  className?: string;
  defaultLimit?: number;
}

export function StravaActivityFeed({ className = '', defaultLimit = 10 }: StravaActivityFeedProps) {
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [activeFilter, setActiveFilter] = useState<SportFilter>('All');

  const fetchActivities = useCallback(async (currentOffset: number, filter: SportFilter, replace: boolean) => {
    if (replace) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = new URLSearchParams({
        limit: String(defaultLimit),
        offset: String(currentOffset),
      });
      if (filter !== 'All') {
        params.set('type', filter === 'Run' ? 'Run' : filter === 'Ride' ? 'Ride' : filter);
      }

      const res = await fetch(`/api/strava/activities?${params}`);
      if (!res.ok) return;

      const data = await res.json() as StravaActivity[];

      if (replace) {
        setActivities(data);
      } else {
        setActivities(prev => [...prev, ...data]);
      }

      setHasMore(data.length === defaultLimit);
      setOffset(currentOffset + data.length);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [defaultLimit]);

  useEffect(() => {
    setOffset(0);
    fetchActivities(0, activeFilter, true);
  }, [activeFilter, fetchActivities]);

  const handleLoadMore = () => {
    fetchActivities(offset, activeFilter, false);
  };

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Sport filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
        {SPORT_FILTERS.map(filter => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all border"
            style={
              activeFilter === filter
                ? { borderColor: '#FC4C02', color: '#FC4C02', background: 'rgba(252,76,2,0.1)' }
                : { borderColor: '#2A2A2A', color: '#888888', background: 'transparent' }
            }
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Activity list */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-36 skeleton" />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-12">
          <Activity className="w-12 h-12 text-[#2A2A2A] mx-auto mb-3" />
          <p className="text-[#888888] text-sm">No activities found</p>
          <p className="text-[#555555] text-xs mt-1">
            {activeFilter !== 'All' ? `No ${activeFilter} activities synced yet.` : 'Connect and sync your Strava account.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {activities.map(activity => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && activities.length > 0 && !loading && (
        <button
          onClick={handleLoadMore}
          disabled={loadingMore}
          className="flex items-center justify-center gap-2 py-3 border border-[#2A2A2A] text-[#888888] text-sm hover:border-[#FC4C02] hover:text-[#FC4C02] transition-all disabled:opacity-50"
        >
          {loadingMore ? (
            <div className="w-4 h-4 border-2 border-[#FC4C02] border-t-transparent rounded-full animate-spin" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
          {loadingMore ? 'Loading...' : 'Load more'}
        </button>
      )}
    </div>
  );
}
