'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TrendingUp, Activity, Dumbbell, Trophy, ChevronRight } from 'lucide-react';
import { useLang } from '@/lib/lang';

interface WorkoutLog {
  id: number;
  name: string;
  date: string;
  durationMin: number | null;
}

interface PRRecord {
  exerciseName: string;
  weightKg: number;
  reps: number;
}

interface StravaActivity {
  id: number;
  name: string;
  sport_type: string;
  distance: number;
  moving_time: number;
  start_date: string;
}

function groupByWeek(activities: StravaActivity[]) {
  const weeks: Record<string, number> = {};
  for (const a of activities) {
    const d = new Date(a.start_date);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().slice(0, 10);
    weeks[key] = (weeks[key] ?? 0) + a.distance / 1000;
  }
  return Object.entries(weeks)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([week, km]) => ({ week, km: Math.round(km * 10) / 10 }));
}

function groupBySport(activities: StravaActivity[]) {
  const sports: Record<string, number> = {};
  for (const a of activities) {
    const t = a.sport_type;
    sports[t] = (sports[t] ?? 0) + a.moving_time;
  }
  const total = Object.values(sports).reduce((s, v) => s + v, 0);
  return Object.entries(sports).map(([sport, time]) => ({
    sport,
    pct: total > 0 ? Math.round((time / total) * 100) : 0,
  }));
}

const SPORT_COLORS = ['#6366F1', '#00CC88', '#FFD700', '#A78BFA', '#CC0044', '#0088FF'];

export default function AnalyticsHubPage() {
  const { t, lang } = useLang();
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [prs, setPRs] = useState<PRRecord[]>([]);
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [stravaConnected, setStravaConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const dateLocale = lang === 'pl' ? 'pl-PL' : 'en-US';

  useEffect(() => {
    async function load() {
      try {
        const [workRes, prRes, statusRes] = await Promise.all([
          fetch('/api/workouts?mine=true&limit=50'),
          fetch('/api/records'),
          fetch('/api/strava/status'),
        ]);
        if (workRes.ok) setWorkouts(await workRes.json());
        if (prRes.ok) {
          const data = await prRes.json() as { best?: PRRecord[] };
          setPRs(data.best ?? []);
        }
        if (statusRes.ok) {
          const status = await statusRes.json() as { connected: boolean };
          setStravaConnected(status.connected);
          if (status.connected) {
            const actRes = await fetch('/api/strava/activities?limit=50');
            if (actRes.ok) setActivities(await actRes.json());
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

  const weeklyData = groupByWeek(activities);
  const sportBreakdown = groupBySport(activities);
  const maxKm = Math.max(...weeklyData.map((w) => w.km), 1);

  const totalKm = activities.reduce((s, a) => s + a.distance / 1000, 0);
  const totalWorkouts = workouts.length;
  const totalPRs = prs.length;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto md:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-[rgba(99,102,241,0.1)] border border-[rgba(99,102,241,0.2)] flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-[#6366F1]" />
        </div>
        <div>
          <h1 className="font-display text-3xl text-white tracking-wider">{t('hub_analytics_title')}</h1>
          <p className="text-[#888888] text-sm">{t('hub_analytics_subtitle')}</p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: t('hub_ana_total_km'), value: totalKm.toFixed(0), icon: Activity, color: '#6366F1' },
          { label: t('hub_ana_workouts'), value: String(totalWorkouts), icon: Dumbbell, color: '#00CC88' },
          { label: t('hub_ana_records'), value: String(totalPRs), icon: Trophy, color: '#FFD700' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-[var(--bg-card)] border border-[var(--border)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4" style={{ color: s.color }} />
                <span className="text-[10px] text-[#555555] uppercase tracking-wider">{s.label}</span>
              </div>
              <p className="font-display text-2xl text-white">{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* Weekly distance chart */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] p-5 mb-6">
        <h2 className="font-display text-sm text-[#888888] tracking-wider mb-4">{t('hub_ana_weekly_distance')}</h2>
        {loading ? (
          <div className="h-40 skeleton" />
        ) : !stravaConnected ? (
          <div className="text-center py-8">
            <Activity className="w-10 h-10 text-[#2A2A2A] mx-auto mb-2" />
            <p className="text-[#888888] text-sm mb-2">{t('hub_ana_connect_strava')}</p>
            <Link href="/profile" className="text-xs text-[#6366F1] hover:underline">{t('hub_ana_connect_btn')}</Link>
          </div>
        ) : weeklyData.length === 0 ? (
          <p className="text-[#888888] text-sm text-center py-6">{t('hub_ana_no_data')}</p>
        ) : (
          <div className="flex items-end gap-2 h-40">
            {weeklyData.map((w) => {
              const height = Math.max((w.km / maxKm) * 100, 4);
              return (
                <div key={w.week} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-[#555555]">{w.km}</span>
                  <div
                    className="w-full bg-[#6366F1] transition-all duration-500 hover:bg-[#818CF8]"
                    style={{ height: `${height}%`, minHeight: 4 }}
                    title={`${w.week}: ${w.km} km`}
                  />
                  <span className="text-[8px] text-[#444444]">
                    {new Date(w.week).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sport breakdown */}
      {sportBreakdown.length > 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] p-5 mb-6">
          <h2 className="font-display text-sm text-[#888888] tracking-wider mb-4">{t('hub_ana_sport_breakdown')}</h2>
          <div className="flex flex-col gap-2">
            {sportBreakdown.map((s, i) => (
              <div key={s.sport} className="flex items-center gap-3">
                <span className="text-xs text-[#888888] w-28 truncate">{s.sport.replace(/([A-Z])/g, ' $1').trim()}</span>
                <div className="flex-1 h-4 bg-[var(--bg-elevated)] border border-[var(--border)] overflow-hidden">
                  <div
                    className="h-full transition-all duration-700"
                    style={{ width: `${s.pct}%`, background: SPORT_COLORS[i % SPORT_COLORS.length] }}
                  />
                </div>
                <span className="text-xs text-white w-8 text-right">{s.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Personal Records */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-sm text-[#888888] tracking-wider">{t('hub_ana_personal_records')}</h2>
          <Link href="/stats" className="text-xs text-[#6366F1] hover:text-[#818CF8] flex items-center gap-1 transition-colors">
            {t('hub_ana_all')} <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        {loading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-12 skeleton" />)}
          </div>
        ) : prs.length === 0 ? (
          <p className="text-[#888888] text-sm text-center py-4">{t('hub_ana_no_records')}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {prs.slice(0, 8).map((pr, i) => (
              <div key={pr.exerciseName} className="flex items-center gap-4 p-3 bg-[var(--bg-card)] border border-[var(--border)]">
                <span className="font-display text-base text-[#6366F1] w-6 shrink-0">#{i + 1}</span>
                <span className="text-sm text-white flex-1 truncate">{pr.exerciseName}</span>
                <span className="text-sm font-display text-white shrink-0">{pr.weightKg}kg x {pr.reps}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Workout frequency chart */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] p-5">
        <h2 className="font-display text-sm text-[#888888] tracking-wider mb-4">{t('hub_ana_workout_freq')}</h2>
        {loading ? (
          <div className="h-24 skeleton" />
        ) : workouts.length === 0 ? (
          <p className="text-[#888888] text-sm text-center py-4">{t('hub_ana_no_workout_data')}</p>
        ) : (() => {
          // Build a simple week-by-week frequency
          const weekCounts: Record<string, number> = {};
          for (const w of workouts) {
            const d = new Date(w.date);
            const weekStart = new Date(d);
            weekStart.setDate(d.getDate() - d.getDay());
            const key = weekStart.toISOString().slice(0, 10);
            weekCounts[key] = (weekCounts[key] ?? 0) + 1;
          }
          const weeks = Object.entries(weekCounts)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-12);
          const maxCount = Math.max(...weeks.map(([, c]) => c), 1);

          return (
            <div className="flex items-end gap-1.5 h-24">
              {weeks.map(([week, count]) => {
                const h = Math.max((count / maxCount) * 100, 6);
                return (
                  <div key={week} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-[rgba(99,102,241,0.6)] hover:bg-[#6366F1] transition-colors"
                      style={{ height: `${h}%`, minHeight: 4 }}
                      title={`${week}: ${count} workouts`}
                    />
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
