'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, X, ExternalLink, Moon, Dumbbell, Apple, Activity, Brain, Zap } from 'lucide-react';
import { ContributionHeatmap } from '@/components/stats/contribution-heatmap';
import { PRChart } from '@/components/stats/pr-chart';
import { StravaStatsCard } from '@/components/strava/strava-stats-card';
import { StravaActivityFeed } from '@/components/strava/strava-activity-feed';

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

type TabId = 'strava' | 'overview' | 'records' | 'trainpilot';

const TABS: { id: TabId; label: string }[] = [
  { id: 'strava',      label: 'Strava' },
  { id: 'overview',    label: 'Przegląd' },
  { id: 'records',     label: 'Postępy PR' },
  { id: 'trainpilot',  label: 'TrainPilot ↗' },
];

export default function StatsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('strava');
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [heatmapData, setHeatmapData] = useState<Record<string, number>>({});
  const [allPRs, setAllPRs] = useState<PRRecord[]>([]);
  const [selectedPRExercise, setSelectedPRExercise] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      const [sumRes, heatRes, prRes] = await Promise.all([
        fetch('/api/stats?type=summary'),
        fetch('/api/stats?type=heatmap'),
        fetch('/api/records'),
      ]);

      if (sumRes.ok) setSummary(await sumRes.json());
      if (heatRes.ok) setHeatmapData(await heatRes.json());
      if (prRes.ok) {
        const data = await prRes.json() as { all?: PRRecord[] };
        setAllPRs(data.all ?? []);
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

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-white tracking-wider">STATYSTYKI & POSTĘPY</h1>
          <p className="text-[#888888] text-sm mt-1">Śledź swoje długoterminowe postępy</p>
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
            <h3 className="font-display text-sm text-[#888888] tracking-wider mb-4">AKTYWNOŚCI</h3>
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
                  { label: 'Łącznie treningów', value: summary?.totalWorkouts ?? 0 },
                  { label: 'Ten tydzień', value: summary?.weekWorkouts ?? 0 },
                  { label: 'Ten miesiąc', value: summary?.monthWorkouts ?? 0 },
                  { label: 'Rekordy w mies.', value: summary?.monthPRs ?? 0 },
                  { label: 'Łącznie rekordów', value: summary?.totalPRs ?? 0 },
                  { label: 'Serie w mies.', value: summary?.totalSets ?? 0 },
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

              {/* TrainPilot teaser */}
              <div className="bg-[var(--bg-card)] border border-[#6366F1]/30 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#6366F1]" />
                    <span className="font-display text-sm text-[#888888] tracking-wider">GŁĘBOKA ANALIZA → TRAINPILOT</span>
                  </div>
                  <a
                    href={TRAINPILOT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#6366F1] flex items-center gap-1 hover:text-[#818CF8] transition-colors"
                  >
                    Otwórz <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-xs text-[#555555]">
                  Parametry ciała, sen, HRV, odżywianie i analiza AI — wszystko w TrainPilot.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'records' && (
            <div className="flex flex-col gap-4">
              {/* Exercise selector */}
              <div className="bg-[var(--bg-card)] border border-[var(--border)] p-4">
                <h3 className="font-display text-sm text-[#888888] tracking-wider mb-3">WYBIERZ ĆWICZENIE</h3>
                {prExercises.length === 0 ? (
                  <p className="text-[#555555] text-sm">Brak historii rekordów. Zaloguj pierwszy trening!</p>
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
                    <p className="text-xs text-[#888888]">Twój osobisty panel treningowy</p>
                  </div>
                </div>
                <p className="text-sm text-[#888888] mb-5 leading-relaxed">
                  Parametry ciała, sen, HRV, dane z Garmina, odżywianie i analiza AI — to wszystko jest w TrainPilot.
                  TrainMate to platforma społeczna, TrainPilot to Twój prywatny panel wydajności.
                </p>
                <a
                  href={TRAINPILOT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold uppercase tracking-wider transition-all hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                  style={{ background: 'linear-gradient(135deg, #6366F1, #818CF8)' }}
                >
                  Otwórz TrainPilot
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              {/* Feature grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  {
                    icon: Activity,
                    color: '#00D4FF',
                    title: 'Garmin & aktywności',
                    desc: 'Synchronizacja TSS, CTL/ATL/TSB, moc, HR, NP',
                  },
                  {
                    icon: Moon,
                    color: '#818CF8',
                    title: 'Sen & HRV',
                    desc: 'Jakość snu, fazy, HRV, RHR — codziennie z Garmina',
                  },
                  {
                    icon: Apple,
                    color: '#00CC44',
                    title: 'Odżywianie',
                    desc: 'Kalorie, makro, plany żywieniowe dopasowane do treningu',
                  },
                  {
                    icon: Dumbbell,
                    color: '#FFD700',
                    title: 'Parametry ciała',
                    desc: 'Waga, tkanka tłuszczowa (J-P), pomiary 7 punktów',
                  },
                  {
                    icon: Brain,
                    color: '#A78BFA',
                    title: 'AI Briefing',
                    desc: 'Codzienny raport treningowy generowany przez Claude AI',
                  },
                  {
                    icon: TrendingUp,
                    color: '#FC4C02',
                    title: 'Krzywa mocy',
                    desc: 'MMP, strefy, FTP, W\' — interaktywna analiza mocy',
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
                  TrainMate = aktywność społeczna &nbsp;·&nbsp; TrainPilot = analityka osobista
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
