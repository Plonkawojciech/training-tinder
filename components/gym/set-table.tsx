'use client';

import { Plus, Trash2 } from 'lucide-react';
import { epley1RM } from '@/lib/utils';

interface SetRow {
  reps: number;
  weight: number;
}

interface SetTableProps {
  sets: SetRow[];
  onChange: (sets: SetRow[]) => void;
  showOneRM?: boolean;
}

export function SetTable({ sets, onChange, showOneRM = true }: SetTableProps) {
  function addSet() {
    const last = sets[sets.length - 1];
    onChange([...sets, { reps: last?.reps ?? 8, weight: last?.weight ?? 0 }]);
  }

  function removeSet(index: number) {
    onChange(sets.filter((_, i) => i !== index));
  }

  function updateSet(index: number, field: keyof SetRow, value: number) {
    onChange(sets.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  }

  const maxSet = sets.reduce<{ rm: number; weight: number; reps: number }>(
    (best, s) => {
      const rm = epley1RM(s.weight, s.reps);
      return rm > best.rm ? { rm, weight: s.weight, reps: s.reps } : best;
    },
    { rm: 0, weight: 0, reps: 0 }
  );

  return (
    <div>
      <div className="grid grid-cols-[40px_1fr_1fr_40px] gap-2 mb-2">
        <div className="text-xs text-[#888888] uppercase tracking-wider text-center">Seria</div>
        <div className="text-xs text-[#888888] uppercase tracking-wider text-center">Ciężar (kg)</div>
        <div className="text-xs text-[#888888] uppercase tracking-wider text-center">Powt.</div>
        <div />
      </div>

      {sets.map((set, i) => (
        <div key={i} className="grid grid-cols-[40px_1fr_1fr_40px] gap-2 mb-2">
          <div className="flex items-center justify-center text-xs font-bold text-[#888888]">
            {i + 1}
          </div>
          <input
            type="number"
            min="0"
            step="0.5"
            value={set.weight || ''}
            onChange={(e) => updateSet(i, 'weight', parseFloat(e.target.value) || 0)}
            className="bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-2 py-2 text-sm text-center focus:border-[#6366F1] focus:outline-none"
            placeholder="0"
          />
          <input
            type="number"
            min="1"
            max="100"
            value={set.reps || ''}
            onChange={(e) => updateSet(i, 'reps', parseInt(e.target.value) || 0)}
            className="bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-2 py-2 text-sm text-center focus:border-[#6366F1] focus:outline-none"
            placeholder="0"
          />
          <button
            type="button"
            onClick={() => removeSet(i)}
            className="flex items-center justify-center text-[#888888] hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addSet}
        className="flex items-center gap-2 text-xs text-[#6366F1] hover:text-[#818CF8] mt-2 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Dodaj serię
      </button>

      {showOneRM && maxSet.rm > 0 && maxSet.reps > 1 && (
        <div className="mt-3 p-2 bg-[rgba(99,102,241,0.08)] border border-[rgba(99,102,241,0.2)]">
          <p className="text-xs text-[#888888]">
            Szacowane 1RM:{' '}
            <span className="text-[#6366F1] font-bold">{maxSet.rm}kg</span>
            <span className="text-[#555555] ml-2">(formuła Epleya)</span>
          </p>
        </div>
      )}
    </div>
  );
}
