'use client';

import { useState, useEffect } from 'react';
import { Plus, TrendingUp, Scale, Percent, X } from 'lucide-react';
import { ContributionHeatmap } from '@/components/stats/contribution-heatmap';
import { PRChart } from '@/components/stats/pr-chart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StravaStatsCard } from '@/components/strava/strava-stats-card';
import { StravaActivityFeed } from '@/components/strava/strava-activity-feed';

interface BodyStat {
  id: number;
  date: string;
  weightKg: number | null;
  bodyFatPct: number | null;
  notes: string | null;
}

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

type TabId = 'strava' | 'overview' | 'body' | 'records';

const TABS: { id: TabId; label: string }[] = [
  { id: 'strava', label: 'Strava' },
  { id: 'overview', label: 'Overview' },
  { id: 'body', label: 'Body Stats' },
  { id: 'records', label: 'PR Progress' },
];

export default function StatsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('strava');
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [heatmapData, setHeatmapData] = useState<Record<string, number>>({});
  const [bodyStats, setBodyStats] = useState<BodyStat[]>([]);
  const [allPRs, setAllPRs] = useState<PRRecord[]>([]);
  const [selectedPRExercise, setSelectedPRExercise] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddStat, setShowAddStat] = useState(false);
  const [newStat, setNewStat] = useState({ date: new Date().toISOString().slice(0, 10), weightKg: '', bodyFatPct: '', notes: '' });
  const [savingStat, setSavingStat] = useState(false);

  useEffect(() => {
    if (activeTab !== 'strava') {
      loadAll();
    } else {
      setLoading(false);
    }
  }, [activeTab]);

  async function loadAll() {
    setLoading(true);
    try {
      const [sumRes, heatRes, bodyRes, prRes] = await Promise.all([
        fetch('/api/stats?type=summary'),
        fetch('/api/stats?type=heatmap'),
        fetch('/api/stats?type=body'),
        fetch('/api/records'),
      ]);

      if (sumRes.ok) setSummary(await sumRes.json());
      if (heatRes.ok) setHeatmapData(await heatRes.json());
      if (bodyRes.ok) setBodyStats(await bodyRes.json());
      if (prRes.ok) {
        const data = await prRes.json() as { all: PRRecord[] };
        setAllPRs(data.all ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAddStat() {
    setSavingStat(true);
    try {
      const res = await fetch('/api/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: newStat.date,
          weightKg: newStat.weightKg ? parseFloat(newStat.weightKg) : undefined,
          bodyFatPct: newStat.bodyFatPct ? parseFloat(newStat.bodyFatPct) : undefined,
          notes: newStat.notes || undefined,
        }),
      });
      if (res.ok) {
        setShowAddStat(false);
        setNewStat({ date: new Date().toISOString().slice(0, 10), weightKg: '', bodyFatPct: '', notes: '' });
        const bodyRes = await fetch('/api/stats?type=body');
        if (bodyRes.ok) setBodyStats(await bodyRes.json());
      }
    } finally {
      setSavingStat(false);
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

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-white tracking-wider">STATS & PROGRESS</h1>
          <p className="text-[#888888] text-sm mt-1">Track your long-term progress</p>
        </div>
        {activeTab !== 'strava' && (
          <Button onClick={() => setShowAddStat(true)}>
            <Plus className="w-4 h-4" />
            Log Stats
          </Button>
        )}
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
                ? { borderColor: '#FC4C02', color: '#FC4C02' }
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
          {/* Left: Stats */}
          <div>
            <StravaStatsCard showSyncButton />
          </div>
          {/* Right: Activity feed */}
          <div>
            <h3 className="font-display text-sm text-[#888888] tracking-wider mb-4">ACTIVITY FEED</h3>
            <StravaActivityFeed defaultLimit={10} />
          </div>
        </div>
      )}

      {loading && activeTab !== 'strava' ? (
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
                  { label: 'Total Workouts', value: summary?.totalWorkouts ?? 0 },
                  { label: 'This Week', value: summary?.weekWorkouts ?? 0 },
                  { label: 'This Month', value: summary?.monthWorkouts ?? 0 },
                  { label: 'Month PRs', value: summary?.monthPRs ?? 0 },
                  { label: 'Total PRs', value: summary?.totalPRs ?? 0 },
                  { label: 'Month Sets', value: summary?.totalSets ?? 0 },
                ].map((stat) => (
                  <div key={stat.label} className="bg-[var(--bg-card)] border border-[var(--border)] p-4 text-center">
                    <p className="font-display text-2xl text-white">{stat.value}</p>
                    <p className="text-[10px] text-[#888888] uppercase tracking-wider mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Heatmap */}
              <div className="bg-[var(--bg-card)] border border-[var(--border)] p-4">
                <ContributionHeatmap data={heatmapData} />
              </div>

              {/* Quick body stats */}
              {bodyStats.length > 0 && (
                <div className="bg-[var(--bg-card)] border border-[var(--border)] p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display text-sm text-[#888888] tracking-wider">LATEST BODY STATS</h3>
                    <button onClick={() => setActiveTab('body')} className="text-xs text-[#7C3AED]">View all</button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {bodyStats[0]?.weightKg && (
                      <div className="flex items-center gap-3">
                        <Scale className="w-5 h-5 text-[#7C3AED]" />
                        <div>
                          <p className="font-display text-xl text-white">{bodyStats[0].weightKg}kg</p>
                          <p className="text-xs text-[#888888]">Body weight</p>
                        </div>
                      </div>
                    )}
                    {bodyStats[0]?.bodyFatPct && (
                      <div className="flex items-center gap-3">
                        <Percent className="w-5 h-5 text-[#7C3AED]" />
                        <div>
                          <p className="font-display text-xl text-white">{bodyStats[0].bodyFatPct}%</p>
                          <p className="text-xs text-[#888888]">Body fat</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'body' && (
            <div className="flex flex-col gap-4">
              <div className="bg-[var(--bg-card)] border border-[var(--border)] p-4">
                {bodyStats.length === 0 ? (
                  <div className="text-center py-8">
                    <Scale className="w-10 h-10 text-[#2A2A2A] mx-auto mb-3" />
                    <p className="text-[#888888] text-sm mb-3">No body stats logged yet</p>
                    <Button size="sm" onClick={() => setShowAddStat(true)}>
                      <Plus className="w-4 h-4" />
                      Log First Stat
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Weight chart */}
                    {bodyStats.some((s) => s.weightKg) && (
                      <div className="mb-6">
                        <PRChart
                          data={bodyStats
                            .filter((s) => s.weightKg)
                            .map((s) => ({ date: s.date, weightKg: s.weightKg!, reps: 1 }))}
                          exerciseName="Body Weight (kg)"
                        />
                      </div>
                    )}

                    {/* Stats table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-[var(--border)]">
                            <th className="text-left py-2 text-[#888888] uppercase tracking-wider font-semibold">Date</th>
                            <th className="text-right py-2 text-[#888888] uppercase tracking-wider font-semibold">Weight</th>
                            <th className="text-right py-2 text-[#888888] uppercase tracking-wider font-semibold">Body Fat</th>
                            <th className="text-left py-2 text-[#888888] uppercase tracking-wider font-semibold">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bodyStats.map((stat) => (
                            <tr key={stat.id} className="border-b border-[#0D0D0D]">
                              <td className="py-2 text-[#888888]">
                                {new Date(stat.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </td>
                              <td className="py-2 text-right text-white font-bold">
                                {stat.weightKg ? `${stat.weightKg}kg` : '—'}
                              </td>
                              <td className="py-2 text-right text-white font-bold">
                                {stat.bodyFatPct ? `${stat.bodyFatPct}%` : '—'}
                              </td>
                              <td className="py-2 text-[#555555] max-w-[200px] truncate">
                                {stat.notes ?? ''}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === 'records' && (
            <div className="flex flex-col gap-4">
              {/* Exercise selector */}
              <div className="bg-[var(--bg-card)] border border-[var(--border)] p-4">
                <h3 className="font-display text-sm text-[#888888] tracking-wider mb-3">SELECT EXERCISE</h3>
                {prExercises.length === 0 ? (
                  <p className="text-[#555555] text-sm">No PR history yet. Start logging workouts!</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {prExercises.map((ex) => (
                      <button
                        key={ex}
                        onClick={() => setSelectedPRExercise(ex === selectedPRExercise ? null : ex)}
                        className="px-3 py-1.5 text-xs border transition-all"
                        style={
                          selectedPRExercise === ex
                            ? { borderColor: '#7C3AED', color: '#7C3AED', background: 'rgba(124,58,237,0.1)' }
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
                      <TrendingUp className="w-4 h-4 text-[#7C3AED]" />
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
        </>
      )}

      {/* Add Stats Modal */}
      {showAddStat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl text-white tracking-wider">LOG BODY STATS</h3>
              <button onClick={() => setShowAddStat(false)} className="text-[#888888] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <Input
                label="Date"
                type="date"
                value={newStat.date}
                onChange={(e) => setNewStat((p) => ({ ...p, date: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Weight (kg)"
                  type="number"
                  step="0.1"
                  min="0"
                  value={newStat.weightKg}
                  onChange={(e) => setNewStat((p) => ({ ...p, weightKg: e.target.value }))}
                  placeholder="75.5"
                />
                <Input
                  label="Body Fat %"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={newStat.bodyFatPct}
                  onChange={(e) => setNewStat((p) => ({ ...p, bodyFatPct: e.target.value }))}
                  placeholder="15.0"
                />
              </div>
              <Input
                label="Notes (optional)"
                value={newStat.notes}
                onChange={(e) => setNewStat((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Morning weight, post-workout, etc."
              />
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowAddStat(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleAddStat} loading={savingStat} className="flex-1">
                <Plus className="w-4 h-4" />
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
