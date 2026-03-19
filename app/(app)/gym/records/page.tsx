'use client';

import { useState, useEffect } from 'react';
import { Trophy, Plus, X, TrendingUp } from 'lucide-react';
import { PRCard } from '@/components/gym/pr-card';
import { PRChart } from '@/components/stats/pr-chart';
import { Big4Display } from '@/components/gym/big4-display';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BIG4_EXERCISES } from '@/lib/exercises';
import { epley1RM } from '@/lib/utils';
import { useLang } from '@/lib/lang';

interface PRRecord {
  id: number;
  exerciseName: string;
  weightKg: number;
  reps: number;
  achievedAt: string;
  notes: string | null;
}

interface PRHistory {
  exerciseName: string;
  date: string;
  weightKg: number;
  reps: number;
}

export default function PersonalRecordsPage() {
  const { t, lang } = useLang();
  const [prs, setPrs] = useState<PRRecord[]>([]);
  const [allPrs, setAllPrs] = useState<PRRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [history, setHistory] = useState<PRHistory[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPR, setNewPR] = useState({ exerciseName: '', weightKg: '', reps: '1', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPRs();
  }, []);

  async function loadPRs() {
    setLoading(true);
    try {
      const res = await fetch('/api/records');
      if (res.ok) {
        const data = await res.json() as { best: PRRecord[]; all: PRRecord[] };
        setPrs(data.best ?? []);
        setAllPrs(data.all ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleExerciseClick(exerciseName: string) {
    setSelectedExercise(exerciseName);
    const hist = allPrs
      .filter((r) => r.exerciseName === exerciseName)
      .map((r) => ({
        exerciseName: r.exerciseName,
        date: r.achievedAt,
        weightKg: r.weightKg,
        reps: r.reps,
      }));
    setHistory(hist);
  }

  async function handleAddPR() {
    if (!newPR.exerciseName || !newPR.weightKg || !newPR.reps) return;
    setSaving(true);
    try {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseName: newPR.exerciseName,
          weightKg: parseFloat(newPR.weightKg),
          reps: parseInt(newPR.reps),
          notes: newPR.notes || undefined,
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewPR({ exerciseName: '', weightKg: '', reps: '1', notes: '' });
        await loadPRs();
      }
    } finally {
      setSaving(false);
    }
  }

  const big4Records = prs.filter((pr) => BIG4_EXERCISES.includes(pr.exerciseName));
  const otherRecords = prs.filter((pr) => !BIG4_EXERCISES.includes(pr.exerciseName));

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-white tracking-wider">{t('records_title')}</h1>
          <p className="text-[#888888] text-sm mt-1">{prs.length} {t('records_exercises')}</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4" />
          {t('records_add')}
        </Button>
      </div>

      {/* Big 4 */}
      <div className="mb-6">
        <Big4Display records={big4Records} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: PR list */}
        <div>
          <h2 className="font-display text-sm text-[#888888] tracking-wider mb-3">{t('records_all')}</h2>
          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-24 skeleton" />
              ))}
            </div>
          ) : prs.length === 0 ? (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] p-8 text-center">
              <Trophy className="w-10 h-10 text-[#2A2A2A] mx-auto mb-3" />
              <p className="text-[#888888] text-sm mb-3">{t('gym_no_records')}</p>
              <Button size="sm" onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4" />
                {t('records_add_first')}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {/* Big 4 highlighted */}
              {BIG4_EXERCISES.map((lift) => {
                const pr = prs.find((p) => p.exerciseName === lift);
                if (!pr) return null;
                return (
                  <div
                    key={lift}
                    onClick={() => handleExerciseClick(lift)}
                    className="cursor-pointer"
                  >
                    <PRCard
                      exerciseName={pr.exerciseName}
                      weightKg={pr.weightKg}
                      reps={pr.reps}
                      achievedAt={pr.achievedAt}
                      notes={pr.notes}
                      isBig4
                    />
                  </div>
                );
              })}
              {/* Other PRs */}
              {otherRecords.map((pr) => (
                <div
                  key={pr.id}
                  onClick={() => handleExerciseClick(pr.exerciseName)}
                  className="cursor-pointer"
                >
                  <PRCard
                    exerciseName={pr.exerciseName}
                    weightKg={pr.weightKg}
                    reps={pr.reps}
                    achievedAt={pr.achievedAt}
                    notes={pr.notes}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: History chart */}
        <div>
          <h2 className="font-display text-sm text-[#888888] tracking-wider mb-3">
            {t('records_history')}
          </h2>
          {selectedExercise ? (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#6366F1]" />
                  <span className="font-semibold text-white text-sm">{selectedExercise}</span>
                </div>
                <button
                  onClick={() => setSelectedExercise(null)}
                  className="text-[#555555] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <PRChart data={history} exerciseName={selectedExercise} />

              {/* History table */}
              <div className="mt-4 border-t border-[var(--border)] pt-4">
                <p className="text-xs text-[#555555] uppercase tracking-wider mb-2">{t('records_all_entries')}</p>
                <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                  {history
                    .slice()
                    .reverse()
                    .map((h, i) => (
                      <div key={i} className="flex items-center justify-between py-1 text-xs border-b border-[#0D0D0D]">
                        <span className="text-[#555555]">
                          {new Date(h.date).toLocaleDateString(lang === 'pl' ? 'pl-PL' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className="text-white font-bold">{h.weightKg}kg × {h.reps}</span>
                        <span className="text-[#6366F1] text-[10px]">
                          ~{epley1RM(h.weightKg, h.reps)}kg 1RM
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] p-8 text-center">
              <TrendingUp className="w-10 h-10 text-[#2A2A2A] mx-auto mb-3" />
              <p className="text-[#888888] text-sm">
                {t('records_click_hint')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add PR Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl text-white tracking-wider">{t('records_add_title')}</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#888888] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <Input
                label={t('records_exercise_name')}
                value={newPR.exerciseName}
                onChange={(e) => setNewPR((p) => ({ ...p, exerciseName: e.target.value }))}
                placeholder={t('records_exercise_ph')}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label={t('records_weight')}
                  type="number"
                  step="0.5"
                  min="0"
                  value={newPR.weightKg}
                  onChange={(e) => setNewPR((p) => ({ ...p, weightKg: e.target.value }))}
                  placeholder="100"
                />
                <Input
                  label={t('records_reps')}
                  type="number"
                  min="1"
                  value={newPR.reps}
                  onChange={(e) => setNewPR((p) => ({ ...p, reps: e.target.value }))}
                  placeholder="1"
                />
              </div>
              {newPR.weightKg && newPR.reps && parseInt(newPR.reps) > 1 && (
                <div className="p-2 bg-[rgba(99,102,241,0.08)] border border-[rgba(99,102,241,0.2)] text-xs text-[#888888]">
                  {t('records_est_1rm')}{' '}
                  <span className="text-[#6366F1] font-bold">
                    {epley1RM(parseFloat(newPR.weightKg), parseInt(newPR.reps))}kg
                  </span>
                </div>
              )}
              <Input
                label={t('records_notes')}
                value={newPR.notes}
                onChange={(e) => setNewPR((p) => ({ ...p, notes: e.target.value }))}
                placeholder={t('records_notes_ph')}
              />
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
                {t('gen_cancel')}
              </Button>
              <Button onClick={handleAddPR} loading={saving} className="flex-1">
                <Trophy className="w-4 h-4" />
                {t('records_save')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
