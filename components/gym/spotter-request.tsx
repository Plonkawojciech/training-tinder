'use client';

import { useState } from 'react';
import { X, CheckCircle } from 'lucide-react';

const EXERCISES = [
  'Bench Press', 'Squat', 'Deadlift', 'Overhead Press', 'Barbell Row',
  'Incline Bench Press', 'Romanian Deadlift', 'Front Squat', 'Hip Thrust',
  'Pull-up', 'Dips', 'Inne',
];

interface SpotterRequestProps {
  gymName: string;
  gymPlaceId?: string | null;
}

export function SpotterRequest({ gymName, gymPlaceId }: SpotterRequestProps) {
  const [open, setOpen] = useState(false);
  const [exercise, setExercise] = useState('');
  const [customExercise, setCustomExercise] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const finalExercise = exercise === 'Inne' ? customExercise : exercise;
    if (!finalExercise) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/spotter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise: finalExercise,
          weightKg: weightKg ? parseInt(weightKg) : undefined,
          gymName,
          gymPlaceId: gymPlaceId ?? undefined,
          message: message || undefined,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          setOpen(false);
          setSuccess(false);
          setExercise('');
          setCustomExercise('');
          setWeightKg('');
          setMessage('');
        }, 2500);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full py-2.5 bg-red-600 text-white text-xs font-semibold uppercase tracking-wider hover:bg-red-700 hover:shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all flex items-center justify-center gap-2"
      >
        Potrzebujesz asekuranta?
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <h2 className="font-display text-lg text-white tracking-wider">ZNAJDŹ ASEKURANTA</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-[#888888] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {success ? (
              <div className="p-8 text-center">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <p className="text-white font-semibold mb-1">Prośba wysłana!</p>
                <p className="text-[#888888] text-sm">
                  Powiadamiamy użytkowników w {gymName}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-2">
                    Ćwiczenie *
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {EXERCISES.map((ex) => (
                      <button
                        key={ex}
                        type="button"
                        onClick={() => setExercise(ex)}
                        className={`py-1.5 text-xs font-medium border transition-all ${
                          exercise === ex
                            ? 'border-[#6366F1] bg-[rgba(99,102,241,0.1)] text-[#6366F1]'
                            : 'border-[var(--border)] text-[#888888] hover:border-[#444444] hover:text-white'
                        }`}
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>

                {exercise === 'Inne' && (
                  <input
                    type="text"
                    value={customExercise}
                    onChange={(e) => setCustomExercise(e.target.value)}
                    placeholder="Wpisz nazwę ćwiczenia..."
                    className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2.5 text-sm placeholder:text-[#444444]"
                    required
                  />
                )}

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-2">
                    Ciężar (kg)
                  </label>
                  <input
                    type="number"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder="e.g. 120"
                    min="0"
                    className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2.5 text-sm placeholder:text-[#444444]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-2">
                    Wiadomość (opcjonalnie)
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="np. Próba nowego rekordu, potrzebuję kogoś doświadczonego..."
                    rows={2}
                    className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2.5 text-sm placeholder:text-[#444444] resize-none"
                  />
                </div>

                <p className="text-xs text-[#555555]">
                  W: <span className="text-[#888888]">{gymName}</span> — Wygasa za 30 minut
                </p>

                <button
                  type="submit"
                  disabled={submitting || (!exercise || (exercise === 'Inne' && !customExercise))}
                  className="w-full py-2.5 bg-red-600 text-white text-sm font-semibold uppercase tracking-wider hover:bg-red-700 disabled:opacity-50 transition-all"
                >
                  {submitting ? 'Wysyłanie...' : 'Wyślij prośbę o asekuranta'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
