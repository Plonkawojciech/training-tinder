'use client';

import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, X, ExternalLink, Moon, Dumbbell, Apple, Activity, Brain, Zap, ArrowUp, ArrowDown, Trophy, BarChart3 } from 'lucide-react';
import { ContributionHeatmap } from '@/components/stats/contribution-heatmap';
import { PRChart } from '@/components/stats/pr-chart';
import { StravaStatsCard } from '@/components/strava/strava-stats-card';
import { StravaActivityFeed } from '@/components/strava/strava-activity-feed';
import { useLang } from '@/lib/lang';

const TRAINPILOT_URL = 'https://trainpilot.vercel.app';

interface StatsSummary {
  totalWorkouts: number;
  weekWorkouts: number;
  monthWorkouts: number;
  monthPRs: number;
  totalSets: number;
  totalPRs: number;
}

interface PRRecord {
  exerciseName: string;
  weightKg: number;
  reps: number;
  achievedAt: string;
}

interface WorkoutEntry {
  id: number;
  date: string;
  type: string;
  name: string;
  durationMin: number | null;
  createdAt: string;
}

type TabId = 'strava' | 'overview' | 'records' | 'trainpilot';

export default function StatsPage() {
  const { t } = useLang();
  const [activeTab, setActiveTab] = useState<TabId>('strava');
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [heatmapData, setHeatmapData] = useState<Record<string, number>>({});
  const [allPRs, setAllPRs] = useState<PRRecord[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);
  const [selectedPRExercise, setSelectedPRExercise] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const TABS: { id: TabId; label: string }[] = [
    { id: 'strava',      label: 'Strava' },
    { id: 'overview',    label: t('stats_tab_overview') },
    { id: 'records',     label: t('stats_tab_records') },
    { id: 'trainpilot',  label: 'TrainPilot ↗' },
  ];

  useEffect(() => {
    if (activeTab !== 'strava' && activeTab !== 'trainpilot') {
      loadAll();
    } else {
      setLoading(false);
    }
  }, [activeTab]);

  async function loadAll() {
    setLoading(true);
    try {
      const [sumRes, heatRes, prRes, wkRes] = await Promise.all([
        fetch('/api/stats?type=summary'),
        fetch('/api/stats?type=heatmap'),
        fetch('/api/records'),
        fetch('/api/workouts?mine=true&limit=500'),
      ]);

      if (sumRes.ok) setSummary(await sumRes.json());
      if (heatRes.ok) setHeatmapData(await heatRes.json());
      if (prRes.ok) {
        const data = await prRes.json() as { all?: PRRecord[] };
        setAllPRs(data.all ?? []);
      }
      if (wkRes.ok) {
        const data = await wkRes.json() as WorkoutEntry[];
        setWorkouts(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoading(false);
    }
  }

  const prExercises = [...new Set(allPRs.map((p) => p.exerciseName))];

  const selectedHistory = selectedPRExercise
    ? allPRs.filter((p) => p.exerciseName === selectedPRExercise).map((p) => ({
        date: p.achievedAt,
        weightKg: p.weightKg,
        reps: p.reps,
      }))
    : [];

  // --- Weekly volume (Mon-Sun for current week) ---
  const weeklyVolume = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const days: { label: string; date: string; count: number }[] = [];
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      days.push({ label: dayLabels[i], date: dateStr, count: 0 });
    }

    for (const w of workouts) {
      const idx = days.findIndex((d) => d.date === w.date);
      if (idx !== -1) days[idx].count++;
    }

    return days;
  }, [workouts]);

  const weeklyMax = Math.max(1, ...weeklyVolume.map((d) => d.count));

  // --- Sport breakdown ---
  const sportBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const w of workouts) {
      const wType = w.type || 'other';
      counts[wType] = (counts[wType] ?? 0) + 1;
    }
    const total = workouts.length || 1;
    const entries = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count, pct: Math.round((count / total) * 100) }));
    return entries;
  }, [workouts]);

  const SPORT_COLORS = ['#6366F1', '#00D4FF', '#00CC44', '#FFD700', '#FC4C02', '#A78BFA', '#F472B6', '#818CF8'];

  // --- Month comparison ---
  const monthComparison = useMemo(() => {
    const now = new Date();
    const thisMonthStr = now.toISOString().slice(0, 7); // "YYYY-MM"
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthStr = lastMonth.toISOString().slice(0, 7);

    let thisCount = 0;
    let lastCount = 0;
    for (const w of workouts) {
      const m = w.date.slice(0, 7);
      if (m === thisMonthStr) thisCount++;
      else if (m === lastMonthStr) lastCount++;
    }

    return { thisCount, lastCount };
  }, [workouts]);

  // --- Best stats ---
  const bestStats = useMemo(() => {
    // Longest workout
    let longestMin = 0;
    for (const w of workouts) {
      if (w.durationMin && w.durationMin > longestMin) longestMin = w.durationMin;
    }

    // Most workouts in a single ISO week
    const weekCounts: Record<string, number> = {};
    for (const w of workouts) {
      const d = new Date(w.date);
      // Get ISO week key: year-week
      const jan1 = new Date(d.getFullYear(), 0, 1);
      const dayNum = Math.floor((d.getTime() - jan1.getTime()) / 86400000);
      const weekNum = Math.ceil((dayNum + jan1.getDay() + 1) / 7);
      const key = `${d.getFullYear()}-W${weekNum}`;
      weekCounts[key] = (weekCounts[key] ?? 0) + 1;
    }
    const mostInWeek = Math.max(0, ...Object.values(weekCounts));

    // Total PRs from allPRs
    const totalPRs = allPRs.length;

    return { longestMin, mostInWeek, totalPRs };
  }, [workouts, allPRs]);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-white tracking-wider">{t('stats_title')}</h1>
          <p className="text-[#888888] text-sm mt-1">{t('stats_subtitle')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] mb-6 overflow-x-auto no-scrollbar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-shrink-0 px-4 py-2.5 text-sm font-medium uppercase tracking-wider border-b-2 transition-all"
            style={
              activeTab === tab.id
                ? { borderColor: '#6366F1', color: '#6366F1' }
                : { borderColor: 'transparent', color: '#888888' }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Strava Tab */}
      {activeTab === 'strava' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div>
            <StravaStatsCard showSyncButton />
          </div>
          <div>
            <h3 className="font-display text-sm text-[#888888] tracking-wider mb-4">{t('stats_activities')}</h3>
            <StravaActivityFeed defaultLimit={10} />
          </div>
        </div>
      )}

      {loading && activeTab !== 'strava' && activeTab !== 'trainpilot' ? (
        <div className="grid grid-cols-1 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-48 skeleton" />)}
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-6">
              {/* Summary stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: t('stats_total_workouts'), value: summary?.totalWorkouts ?? 0 },
                  { label: t('stats_this_week'), value: summary?.weekWorkouts ?? 0 },
                  { label: t('stats_this_month'), value: summary?.monthWorkouts ?? 0 },
                  { label: t('stats_records_month'), value: summary?.monthPRs ?? 0 },
                  { label: t('stats_total_records'), value: summary?.totalPRs ?? 0 },
                  { label: t('stats_sets_month'), value: summary?.totalSets ?? 0 },
                ].map((stat) => (
                  <div key={stat.label} className="bg-[var(--bg-card)] border border-[var(--border)] p-4 text-center">
                    <p className="font-display text-2xl text-white">{stat.value}</p>
                    <p className="text-[10px] text-[#888888] uppercase tracking-wider mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Weekly volume chart */}
              <div className="bg-[var(--bg-card)] border border-[var(--border)] p-4">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-4 h-4 text-[#6366F1]" />
                  <span className="font-display text-sm text-[#888888] tracking-wider">{t('stats_weekly_volume')}</span>
                </div>
                <div className="flex items-end justify-between gap-2 h-32">
                  {weeklyVolume.map((day) => {
                    const barH = day.count > 0 ? Math.max(12, (day.count / weeklyMax) * 100) : 4;
                    const isToday = day.date === new Date().toISOString().slice(0, 10);
                    return (
                      <div key={day.date} className="flex flex-col items-center flex-1 gap-1">
                        <span className="text-[10px] text-[#888888] font-mono">{day.count > 0 ? day.count : ''}</span>
                        <div className="w-full flex items-end justify-center" style={{ height: '100px' }}>
                          <div
                            className="w-full max-w-[32px] rounded-sm transition-all"
                            style={{
                              height: `${barH}%`,
                              background: day.count > 0
                                ? (isToday ? '#818CF8' : '#6366F1')
                                : 'rgba(136,136,136,0.15)',
                            }}
                          />
                        </div>
                        <span
                          className="text-[10px] uppercase tracking-wider"
                          style={{ color: isToday ? '#6366F1' : '#555555' }}
                        >
                          {day.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sport breakdown */}
              <div className="bg-[var(--bg-card)] border border-[var(--border)] p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-4 h-4 text-[#00D4FF]" />
                  <span className="font-display text-sm text-[#888888] tracking-wider">{t('stats_sport_breakdown')}</span>
                </div>
                {sportBreakdown.length === 0 ? (
                  <p className="text-[#555555] text-xs">—</p>
                ) : (
                  <>
                    {/* Stacked horizontal bar */}
                    <div className="flex w-full h-5 rounded-sm overflow-hidden mb-3">
                      {sportBreakdown.map((s, i) => (
                        <div
                          key={s.type}
                          style={{
                            width: `${s.pct}%`,
                            background: SPORT_COLORS[i % SPORT_COLORS.length],
                            minWidth: s.pct > 0 ? '4px' : '0',
                          }}
                          title={`${s.type}: ${s.count}`}
                        />
                      ))}
                    </div>
                    {/* Legend badges */}
                    <div className="flex flex-wrap gap-2">
                      {sportBreakdown.map((s, i) => (
                        <div
                          key={s.type}
                          className="flex items-center gap-1.5 px-2 py-1 border border-[var(--border)] rounded-sm"
                        >
                          <div
                            className="w-2.5 h-2.5 rounded-sm"
                            style={{ background: SPORT_COLORS[i % SPORT_COLORS.length] }}
                          />
                          <span className="text-[11px] text-white capitalize">{s.type}</span>
                          <span className="text-[10px] text-[#888888]">{s.count} ({s.pct}%)</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Monthly comparison */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-[#6366F1]" />
                  <span className="font-display text-sm text-[#888888] tracking-wider">{t('stats_comparison')}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                {/* This month */}
                <div className="bg-[var(--bg-card)] border border-[var(--border)] p-4 text-center">
                  <p className="text-[10px] text-[#888888] uppercase tracking-wider mb-2">{t('stats_this_month')}</p>
                  <p className="font-display text-3xl text-white">{monthComparison.thisCount}</p>
                  <p className="text-[10px] text-[#555555] mt-1">{t('stats_workouts_count')}</p>
                  {monthComparison.thisCount > monthComparison.lastCount ? (
                    <div className="flex items-center justify-center gap-1 mt-2 text-[#00CC44]">
                      <ArrowUp className="w-3 h-3" />
                      <span className="text-[10px] font-semibold">
                        +{monthComparison.thisCount - monthComparison.lastCount}
                      </span>
                    </div>
                  ) : monthComparison.thisCount < monthComparison.lastCount ? (
                    <div className="flex items-center justify-center gap-1 mt-2 text-[#FF4444]">
                      <ArrowDown className="w-3 h-3" />
                      <span className="text-[10px] font-semibold">
                        {monthComparison.thisCount - monthComparison.lastCount}
                      </span>
                    </div>
                  ) : (
                    <div className="mt-2 text-[10px] text-[#555555]">=</div>
                  )}
                </div>
                {/* Last month */}
                <div className="bg-[var(--bg-card)] border border-[var(--border)] p-4 text-center">
                  <p className="text-[10px] text-[#888888] uppercase tracking-wider mb-2">{t('stats_last_month')}</p>
                  <p className="font-display text-3xl text-[#888888]">{monthComparison.lastCount}</p>
                  <p className="text-[10px] text-[#555555] mt-1">{t('stats_workouts_count')}</p>
                </div>
                </div>
              </div>

              {/* Best stats */}
              <div className="bg-[var(--bg-card)] border border-[var(--border)] p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-4 h-4 text-[#FFD700]" />
                  <span className="font-display text-sm text-[#888888] tracking-wider">{t('stats_best')}</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="font-display text-2xl text-white">
                      {bestStats.longestMin > 0 ? bestStats.longestMin : '—'}
                    </p>
                    <p className="text-[10px] text-[#888888] uppercase tracking-wider mt-1">
                      {t('stats_longest_workout')}
                    </p>
                    {bestStats.longestMin > 0 && (
                      <p className="text-[10px] text-[#555555]">{t('stats_min')}</p>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="font-display text-2xl text-white">
                      {bestStats.mostInWeek > 0 ? bestStats.mostInWeek : '—'}
                    </p>
                    <p className="text-[10px] text-[#888888] uppercase tracking-wider mt-1">
                      {t('stats_most_week')}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="font-display text-2xl text-white">
                      {bestStats.totalPRs > 0 ? bestStats.totalPRs : '—'}
                    </p>
                    <p className="text-[10px] text-[#888888] uppercase tracking-wider mt-1">
                      {t('stats_total_prs')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Heatmap */}
              <div className="bg-[var(--bg-card)] border border-[var(--border)] p-4">
                <ContributionHeatmap data={heatmapData} />
              </div>

              {/* TrainPilot teaser */}
              <div className="bg-[var(--bg-card)] border border-[#6366F1]/30 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#6366F1]" />
                    <span className="font-display text-sm text-[#888888] tracking-wider">{t('stats_deep_analysis')}</span>
                  </div>
                  <a
                    href={TRAINPILOT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#6366F1] flex items-center gap-1 hover:text-[#818CF8] transition-colors"
                  >
                    {t('stats_open')} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-xs text-[#555555]">
                  {t('stats_trainpilot_desc')}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'records' && (
            <div className="flex flex-col gap-4">
              {/* Exercise selector */}
              <div className="bg-[var(--bg-card)] border border-[var(--border)] p-4">
                <h3 className="font-display text-sm text-[#888888] tracking-wider mb-3">{t('stats_select_exercise')}</h3>
                {prExercises.length === 0 ? (
                  <p className="text-[#555555] text-sm">{t('stats_no_records')}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {prExercises.map((ex) => (
                      <button
                        key={ex}
                        onClick={() => setSelectedPRExercise(ex === selectedPRExercise ? null : ex)}
                        className="px-3 py-1.5 text-xs border transition-all"
                        style={
                          selectedPRExercise === ex
                            ? { borderColor: '#6366F1', color: '#6366F1', background: 'rgba(99,102,241,0.1)' }
                            : { borderColor: '#2A2A2A', color: '#888888', background: 'transparent' }
                        }
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* PR chart */}
              {selectedPRExercise && (
                <div className="bg-[var(--bg-card)] border border-[var(--border)] p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-[#6366F1]" />
                      <span className="font-semibold text-white text-sm">{selectedPRExercise}</span>
                    </div>
                    <button onClick={() => setSelectedPRExercise(null)} className="text-[#555555] hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <PRChart data={selectedHistory} exerciseName={selectedPRExercise} />
                </div>
              )}
            </div>
          )}

          {activeTab === 'trainpilot' && (
            <div className="flex flex-col gap-4">
              {/* Hero card */}
              <div
                className="p-6 border"
                style={{
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(129,140,248,0.06) 100%)',
                  borderColor: 'rgba(99,102,241,0.3)',
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #6366F1, #818CF8)' }}
                  >
                    <Zap className="w-5 h-5 text-white" fill="white" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl text-white tracking-wider">TRAINPILOT</h2>
                    <p className="text-xs text-[#888888]">{t('stats_trainpilot_sub')}</p>
                  </div>
                </div>
                <p className="text-sm text-[#888888] mb-5 leading-relaxed">
                  {t('stats_trainpilot_body')}
                </p>
                <a
                  href={TRAINPILOT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold uppercase tracking-wider transition-all hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                  style={{ background: 'linear-gradient(135deg, #6366F1, #818CF8)' }}
                >
                  {t('stats_open_trainpilot')}
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              {/* Feature grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  {
                    icon: Activity,
                    color: '#00D4FF',
                    title: t('stats_tp_garmin'),
                    desc: t('stats_tp_garmin_desc'),
                  },
                  {
                    icon: Moon,
                    color: '#818CF8',
                    title: t('stats_tp_sleep'),
                    desc: t('stats_tp_sleep_desc'),
                  },
                  {
                    icon: Apple,
                    color: '#00CC44',
                    title: t('stats_tp_nutrition'),
                    desc: t('stats_tp_nutrition_desc'),
                  },
                  {
                    icon: Dumbbell,
                    color: '#FFD700',
                    title: t('stats_tp_body'),
                    desc: t('stats_tp_body_desc'),
                  },
                  {
                    icon: Brain,
                    color: '#A78BFA',
                    title: t('stats_tp_ai'),
                    desc: t('stats_tp_ai_desc'),
                  },
                  {
                    icon: TrendingUp,
                    color: '#FC4C02',
                    title: t('stats_tp_power'),
                    desc: t('stats_tp_power_desc'),
                  },
                ].map((f) => {
                  const Icon = f.icon;
                  return (
                    <div key={f.title} className="bg-[var(--bg-card)] border border-[var(--border)] p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-4 h-4" style={{ color: f.color }} />
                        <span className="text-sm font-semibold text-white">{f.title}</span>
                      </div>
                      <p className="text-xs text-[#555555] leading-relaxed">{f.desc}</p>
                    </div>
                  );
                })}
              </div>

              <div className="border border-[var(--border)] p-4 text-center">
                <p className="text-xs text-[#555555] mb-3">
                  {t('stats_tp_social_vs')}
                </p>
                <a
                  href={TRAINPILOT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#6366F1] hover:text-[#818CF8] inline-flex items-center gap-1.5 transition-colors"
                >
                  trainpilot.vercel.app <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
