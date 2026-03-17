'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Activity, Users, Calendar, ChevronRight, Zap, Route, Clock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StravaStatus {
  connected: boolean;
  athlete?: { firstname?: string; lastname?: string };
}

interface StravaActivity {
  id: number;
  name: string;
  sport_type: string;
  distance: number;
  moving_time: number;
  start_date: string;
}

export default function EnduranceHubPage() {
  const [stravaStatus, setStravaStatus] = useState<StravaStatus | null>(null);
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const statusRes = await fetch('/api/strava/status');
        if (statusRes.ok) {
          const status: StravaStatus = await statusRes.json();
          setStravaStatus(status);
          if (status.connected) {
            const actRes = await fetch('/api/strava/activities?limit=5');
            if (actRes.ok) {
              const acts: StravaActivity[] = await actRes.json();
              setActivities(acts);
            }
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function formatDistance(meters: number) {
    return (meters / 1000).toFixed(1) + ' km';
  }

  function formatDuration(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  function formatSportType(type: string) {
    return type.replace(/([A-Z])/g, ' $1').trim();
  }

  // Mock weekly progress
  const weeklyKm = activities.reduce((sum, a) => sum + a.distance / 1000, 0);
  const weeklyGoal = 50;
  const progressPct = Math.min((weeklyKm / weeklyGoal) * 100, 100);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto md:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-[rgba(99,102,241,0.1)] border border-[rgba(99,102,241,0.2)] flex items-center justify-center">
          <Activity className="w-5 h-5 text-[#6366F1]" />
        </div>
        <div>
          <h1 className="font-display text-3xl text-white tracking-wider">ENDURANCE HUB</h1>
          <p className="text-[#888888] text-sm">Running · Cycling · Swimming · Triathlon</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Ten tydzień', value: weeklyKm.toFixed(1) + ' km', icon: Route, color: '#6366F1' },
          { label: 'Aktywności', value: String(activities.length), icon: Zap, color: '#00CC88' },
          { label: 'Czas ruchu', value: formatDuration(activities.reduce((s, a) => s + a.moving_time, 0)), icon: Clock, color: '#FFD700' },
          { label: 'Cel tygodniowy', value: weeklyGoal + ' km', icon: TrendingUp, color: '#6366F1' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-[var(--bg-card)] border border-[var(--border)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4" style={{ color: stat.color }} />
                <span className="text-[10px] text-[#555555] uppercase tracking-wider">{stat.label}</span>
              </div>
              <p className="font-display text-2xl text-white">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Weekly distance progress */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-sm text-[#888888] tracking-wider">TYGODNIOWY CEL DYSTANSU</h2>
          <span className="text-xs text-[#6366F1] font-semibold">
            {weeklyKm.toFixed(1)} / {weeklyGoal} km
          </span>
        </div>
        <div className="h-3 bg-[var(--bg-elevated)] border border-[var(--border)] overflow-hidden">
          <div
            className="h-full bg-[#6366F1] transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-xs text-[#555555] mt-2">{Math.round(progressPct)}% celu</p>
      </div>

      {/* Strava section */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-sm text-[#888888] tracking-wider">OSTATNIE AKTYWNOŚCI</h2>
          {stravaStatus?.connected && (
            <span className="flex items-center gap-1.5 text-xs text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              Strava połączona
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 skeleton" />
            ))}
          </div>
        ) : !stravaStatus?.connected ? (
          <div className="text-center py-8">
            <Activity className="w-10 h-10 text-[#2A2A2A] mx-auto mb-3" />
            <p className="text-[#888888] text-sm mb-3">Połącz Stravę, aby zobaczyć swoje aktywności</p>
            <Link href="/profile">
              <Button size="sm">Połącz ze Stravą</Button>
            </Link>
          </div>
        ) : activities.length === 0 ? (
          <p className="text-[#888888] text-sm text-center py-6">Brak ostatnich aktywności ze Stravy</p>
        ) : (
          <div className="flex flex-col gap-2">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-4 p-3 bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border)] transition-colors"
              >
                <div className="w-8 h-8 bg-[rgba(99,102,241,0.1)] flex items-center justify-center shrink-0">
                  <Activity className="w-4 h-4 text-[#6366F1]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{activity.name}</p>
                  <p className="text-xs text-[#555555]">{formatSportType(activity.sport_type)} · {new Date(activity.start_date).toLocaleDateString()}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm text-white font-display">{formatDistance(activity.distance)}</p>
                  <p className="text-xs text-[#555555]">{formatDuration(activity.moving_time)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] p-5">
        <h2 className="font-display text-sm text-[#888888] tracking-wider mb-4">SZYBKIE AKCJE</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { href: '/discover?sport=running', label: 'Znajdź Biegaczy', icon: Users },
            { href: '/discover?sport=cycling', label: 'Znajdź Kolarzy', icon: Users },
            { href: '/sessions/new', label: 'Nowa Sesja', icon: Calendar },
          ].map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 p-3 border border-[var(--border)] hover:border-[#6366F1] hover:bg-[rgba(99,102,241,0.05)] transition-all group"
              >
                <Icon className="w-4 h-4 text-[#888888] group-hover:text-[#6366F1] transition-colors" />
                <span className="text-sm text-[#888888] group-hover:text-white transition-colors">{link.label}</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#444444] group-hover:text-[#6366F1] ml-auto transition-colors" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
