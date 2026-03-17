'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, ChevronDown, ChevronUp, Save, Globe, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { ExerciseAutocomplete } from '@/components/gym/exercise-autocomplete';
import { SetTable } from '@/components/gym/set-table';
import { RestTimer } from '@/components/gym/rest-timer';

const WORKOUT_TYPES = [
  { value: 'push', label: 'Push', desc: 'Klatka, ramiona, triceps' },
  { value: 'pull', label: 'Pull', desc: 'Plecy, biceps' },
  { value: 'legs', label: 'Nogi', desc: 'Czwórgłowe, dwugłowe, pośladki' },
  { value: 'fullbody', label: 'Całe ciało', desc: 'Wszystkie partie' },
  { value: 'upper', label: 'Góra ciała', desc: 'Partie górne' },
  { value: 'lower', label: 'Dół ciała', desc: 'Partie dolne' },
  { value: 'custom', label: 'Własny', desc: 'Twój własny split' },
];

const TYPE_COLORS: Record<string, string> = {
  push: '#6366F1',
  pull: '#00D4FF',
  legs: '#00CC44',
  fullbody: '#FFD700',
  upper: '#A78BFA',
  lower: '#CC44FF',
  custom: '#888888',
};

interface SetRow {
  reps: number;
  weight: number;
}

interface ExerciseEntry {
  id: string;
  name: string;
  sets: SetRow[];
  notes: string;
  collapsed: boolean;
}

function generateId() {
  return Math.random().toString(36).slice(2);
}

export default function WorkoutLogPage() {
  const router = useRouter();
  const [workoutType, setWorkoutType] = useState('');
  const [workoutName, setWorkoutName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function addExercise() {
    setExercises((prev) => [
      ...prev,
      {
        id: generateId(),
        name: '',
        sets: [{ reps: 8, weight: 0 }],
        notes: '',
        collapsed: false,
      },
    ]);
  }

  function removeExercise(id: string) {
    setExercises((prev) => prev.filter((e) => e.id !== id));
  }

  function updateExercise(id: string, updates: Partial<ExerciseEntry>) {
    setExercises((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  }

  function toggleCollapse(id: string) {
    setExercises((prev) =>
      prev.map((e) => (e.id === id ? { ...e, collapsed: !e.collapsed } : e))
    );
  }

  async function handleSave() {
    if (!workoutType) {
      setError('Wybierz typ treningu');
      return;
    }
    if (!workoutName.trim()) {
      setError('Podaj nazwę treningu');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        date,
        type: workoutType,
        name: workoutName,
        durationMin: duration ? parseInt(duration) : undefined,
        notes: notes || undefined,
        isPublic,
        exercises: exercises
          .filter((e) => e.name.trim())
          .map((e, i) => ({
            name: e.name,
            sets: e.sets.length,
            repsPerSet: e.sets.map((s) => s.reps),
            weightKg: e.sets.map((s) => s.weight),
            notes: e.notes || undefined,
            orderIndex: i,
          })),
      };

      const res = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save workout');

      router.push('/gym');
    } catch {
      setError('Nie udało się zapisać treningu. Spróbuj ponownie.');
    } finally {
      setSaving(false);
    }
  }

  // Auto-generate workout name from type
  function handleTypeSelect(type: string) {
    setWorkoutType(type);
    if (!workoutName) {
      const label = WORKOUT_TYPES.find((t) => t.value === type)?.label ?? '';
      const today = new Date().toLocaleDateString('pl-PL', { weekday: 'long' });
      const todayCapitalized = today.charAt(0).toUpperCase() + today.slice(1);
      setWorkoutName(`${todayCapitalized} ${label}`);
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl text-white tracking-wider">ZAPISZ TRENING</h1>
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          Anuluj
        </Button>
      </div>

      {/* Workout Type */}
      <div className="mb-6">
        <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-3">
          Typ treningu *
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
          {WORKOUT_TYPES.slice(0, 4).map((type) => {
            const color = TYPE_COLORS[type.value];
            const isSelected = workoutType === type.value;
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => handleTypeSelect(type.value)}
                className="p-3 border text-left transition-all"
                style={
                  isSelected
                    ? { borderColor: color, background: `${color}18`, color }
                    : { borderColor: '#2A2A2A', background: 'transparent', color: '#888888' }
                }
              >
                <div className="font-semibold text-sm">{type.label}</div>
                <div className="text-[10px] mt-0.5 opacity-70">{type.desc}</div>
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {WORKOUT_TYPES.slice(4).map((type) => {
            const color = TYPE_COLORS[type.value];
            const isSelected = workoutType === type.value;
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => handleTypeSelect(type.value)}
                className="p-3 border text-left transition-all"
                style={
                  isSelected
                    ? { borderColor: color, background: `${color}18`, color }
                    : { borderColor: '#2A2A2A', background: 'transparent', color: '#888888' }
                }
              >
                <div className="font-semibold text-sm">{type.label}</div>
                <div className="text-[10px] mt-0.5 opacity-70">{type.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Input
          label="Nazwa treningu *"
          value={workoutName}
          onChange={(e) => setWorkoutName(e.target.value)}
          placeholder="np. Poniedziałek Push"
        />
        <Input
          label="Data"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Input
          label="Czas trwania (minuty)"
          type="number"
          min="1"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="60"
        />
        <div className="flex flex-col">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-2">
            Widoczność
          </label>
          <button
            type="button"
            onClick={() => setIsPublic((p) => !p)}
            className="flex items-center gap-2 p-2.5 border transition-all h-[42px]"
            style={
              isPublic
                ? { borderColor: '#00CC44', background: 'rgba(0,204,68,0.08)', color: '#00CC44' }
                : { borderColor: '#2A2A2A', background: 'transparent', color: '#888888' }
            }
          >
            {isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            <span className="text-sm font-medium">{isPublic ? 'Publiczny' : 'Prywatny'}</span>
          </button>
        </div>
      </div>

      {/* Rest Timer */}
      <div className="mb-6">
        <RestTimer defaultSeconds={90} />
      </div>

      {/* Exercises */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#888888]">
            Ćwiczenia ({exercises.length})
          </label>
          <button
            type="button"
            onClick={addExercise}
            className="flex items-center gap-1.5 text-xs text-[#6366F1] hover:text-[#818CF8] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Dodaj ćwiczenie
          </button>
        </div>

        {exercises.length === 0 && (
          <div
            className="border border-dashed border-[var(--border)] p-8 text-center cursor-pointer hover:border-[#6366F1] transition-all"
            onClick={addExercise}
          >
            <Plus className="w-8 h-8 text-[#2A2A2A] mx-auto mb-2" />
            <p className="text-sm text-[#888888]">Kliknij, aby dodać pierwsze ćwiczenie</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {exercises.map((exercise, index) => (
            <div
              key={exercise.id}
              className="bg-[var(--bg-card)] border border-[var(--border)]"
            >
              {/* Exercise header */}
              <div className="flex items-center gap-3 p-3 border-b border-[var(--border)]">
                <span className="text-xs font-bold text-[#555555] w-5 shrink-0">{index + 1}</span>
                <div className="flex-1">
                  <ExerciseAutocomplete
                    value={exercise.name}
                    onChange={(name) => updateExercise(exercise.id, { name })}
                    placeholder="Nazwa ćwiczenia..."
                  />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleCollapse(exercise.id)}
                    className="text-[#888888] hover:text-white p-1"
                  >
                    {exercise.collapsed ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronUp className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeExercise(exercise.id)}
                    className="text-[#888888] hover:text-red-400 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sets table */}
              {!exercise.collapsed && (
                <div className="p-3">
                  <SetTable
                    sets={exercise.sets}
                    onChange={(sets) => updateExercise(exercise.id, { sets })}
                    showOneRM
                  />
                  <div className="mt-3">
                    <input
                      type="text"
                      value={exercise.notes}
                      onChange={(e) => updateExercise(exercise.id, { notes: e.target.value })}
                      placeholder="Notatki do ćwiczenia (opcjonalnie)..."
                      className="w-full bg-[var(--bg)] border border-[var(--border)] text-[#888888] px-3 py-2 text-xs focus:border-[#6366F1] focus:outline-none placeholder:text-[#333333]"
                    />
                  </div>
                </div>
              )}

              {exercise.collapsed && (
                <div className="px-3 py-2 text-xs text-[#555555]">
                  {exercise.sets.length} serii · kliknij, aby rozwinąć
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="mb-6">
        <Textarea
          label="Notatki do treningu"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Jak poszedł trening? Jakieś spostrzeżenia..."
        />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-900 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={saving}
          className="flex-1"
        >
          Anuluj
        </Button>
        <Button onClick={handleSave} loading={saving} className="flex-1">
          <Save className="w-4 h-4" />
          Zapisz trening
        </Button>
      </div>
    </div>
  );
}
