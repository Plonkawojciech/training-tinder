'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Dumbbell, Plus, ChevronRight, Trophy, Calendar, MapPin, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WorkoutLog {
  id: number;
  name: string;
  type: string;
  durationMin: number | null;
  date: string;
  exercises: { id: number }[];
}

interface PRRecord {
  exerciseName: string;
  weightKg: number;
  reps: number;
}

const SPLIT_COLORS: Record<string, string> = {
  push_pull_legs: '#6366F1',
  full_body: '#00CC88',
  upper_lower: '#FFD700',
  bro_split: '#A78BFA',
  powerlifting: '#CC0044',
};

const SPLIT_LABELS: Record<string, string> = {
  push_pull_legs: 'Push/Pull/Nogi',
  full_body: 'Całe ciało',
  upper_lower: 'Góra/Dół',
  bro_split: 'Bro Split',
  powerlifting: 'Trójbój siłowy',
};

export default function StrengthHubPage() {
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [prs, setPRs] = useState<PRRecord[]>([]);
  const [profile, setProfile] = useState<{
    strengthLevel?: string | null;
    trainingSplits?: string[] | null;
    gymName?: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [workRes, prRes, profRes] = await Promise.all([
          fetch('/api/workouts?mine=true&limit=4'),
          fetch('/api/records'),
          fetch('/api/users/profile'),
        ]);
        if (workRes.ok) setWorkouts(await workRes.json());
        if (prRes.ok) {
          const data = await prRes.json() as { best?: PRRecord[] };
          setPRs((data.best ?? []).slice(0, 5));
        }
        if (profRes.ok) setProfile(await profRes.json());
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const splits = profile?.trainingSplits ?? [];

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto md:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-[rgba(99,102,241,0.1)] border border-[rgba(99,102,241,0.2)] flex items-center justify-center">
          <Dumbbell className="w-5 h-5 text-[#6366F1]" />
        </div>
        <div>
          <h1 className="font-display text-3xl text-white tracking-wider">HUB SIŁOWY</h1>
          <p className="text-[#888888] text-sm">Gym · Powerlifting · Bodybuilding</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Treningi', value: String(workouts.length), icon: Dumbbell, color: '#6366F1' },
          { label: 'Rekordy', value: String(prs.length), icon: Trophy, color: '#FFD700' },
          { label: 'Plan', value: splits.length > 0 ? SPLIT_LABELS[splits[0]]?.split('/')[0] ?? splits[0] : 'Nie ustawiono', icon: Calendar, color: '#00CC88' },
          { label: 'Siłownia', value: profile?.gymName ?? 'Nie ustawiono', icon: MapPin, color: '#888888' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-[var(--bg-card)] border border-[var(--border)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4" style={{ color: stat.color }} />
                <span className="text-[10px] text-[#555555] uppercase tracking-wider">{stat.label}</span>
              </div>
              <p className="font-display text-lg text-white leading-tight">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Training split display */}
      {splits.length > 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] p-5 mb-6">
          <h2 className="font-display text-sm text-[#888888] tracking-wider mb-4">PLANY TRENINGOWE</h2>
          <div className="flex flex-wrap gap-2">
            {splits.map((split) => {
              const color = SPLIT_COLORS[split] ?? '#6366F1';
              return (
                <span
                  key={split}
                  className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider border"
                  style={{ borderColor: color, background: `${color}15`, color }}
                >
                  {SPLIT_LABELS[split] ?? split}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent workouts */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-sm text-[#888888] tracking-wider">OSTATNIE TRENINGI</h2>
          <Link href="/gym" className="text-xs text-[#6366F1] hover:text-[#818CF8] flex items-center gap-1 transition-colors">
            Wszystkie <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 skeleton" />)}
          </div>
        ) : workouts.length === 0 ? (
          <div className="text-center py-8">
            <Dumbbell className="w-10 h-10 text-[#2A2A2A] mx-auto mb-3" />
            <p className="text-[#888888] text-sm mb-3">Brak zapisanych treningów</p>
            <Link href="/gym/log">
              <Button size="sm">
                <Plus className="w-4 h-4" />
                Dodaj pierwszy trening
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {workouts.map((w) => (
              <Link key={w.id} href="/gym">
                <div className="p-4 bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border)] transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-white font-medium truncate">{w.name}</p>
                    <span className="text-[10px] text-[#555555] border border-[var(--border)] px-1.5 py-0.5 uppercase">
                      {w.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#555555]">
                    <span>{new Date(w.date).toLocaleDateString('pl-PL')}</span>
                    {w.durationMin && <span>{w.durationMin}min</span>}
                    <span>{w.exercises?.length ?? 0} ćwiczeń</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Personal Records */}
      {prs.length > 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] p-5 mb-6">
          <h2 className="font-display text-sm text-[#888888] tracking-wider mb-4">REKORDY OSOBISTE</h2>
          <div className="flex flex-col gap-2">
            {prs.map((pr, i) => (
              <div key={pr.exerciseName} className="flex items-center gap-4 p-3 bg-[var(--bg-card)] border border-[var(--border)]">
                <span className="font-display text-lg text-[#6366F1] w-6 shrink-0">#{i + 1}</span>
                <span className="text-sm text-white flex-1">{pr.exerciseName}</span>
                <span className="text-sm font-display text-white">{pr.weightKg}kg × {pr.reps}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] p-5">
        <h2 className="font-display text-sm text-[#888888] tracking-wider mb-4">SZYBKIE AKCJE</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { href: '/gym/log', label: 'Zaloguj Trening', icon: Plus },
            { href: '/gym/finder', label: 'Znajdź Siłownię', icon: MapPin },
            { href: '/gym/live', label: 'Live Siłownia', icon: Radio },
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
