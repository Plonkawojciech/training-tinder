'use client';

import { Trophy, TrendingUp } from 'lucide-react';
import { epley1RM } from '@/lib/utils';

interface PRCardProps {
  exerciseName: string;
  weightKg: number;
  reps: number;
  achievedAt: string;
  notes?: string | null;
  isBig4?: boolean;
}

export function PRCard({ exerciseName, weightKg, reps, achievedAt, notes, isBig4 }: PRCardProps) {
  const oneRM = epley1RM(weightKg, reps);
  const date = new Date(achievedAt).toLocaleDateString('pl-PL', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      className="bg-[var(--bg-card)] border p-4 transition-all hover:border-[#6366F1]"
      style={{ borderColor: isBig4 ? 'rgba(99,102,241,0.4)' : 'var(--border)' }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Trophy
            className="w-4 h-4 shrink-0"
            style={{ color: isBig4 ? '#FFD700' : '#6366F1' }}
          />
          <span className="font-semibold text-white text-sm">{exerciseName}</span>
        </div>
        {isBig4 && (
          <span className="text-[10px] px-1.5 py-0.5 bg-[rgba(255,215,0,0.1)] border border-[rgba(255,215,0,0.3)] text-[#FFD700] uppercase tracking-wider">
            Big 4
          </span>
        )}
      </div>

      <div className="flex items-end gap-4 mt-3">
        <div>
          <p className="font-display text-2xl text-white">{weightKg}kg</p>
          <p className="text-xs text-[#888888]">{reps} rep{reps !== 1 ? 's' : ''}</p>
        </div>
        {reps > 1 && (
          <div className="mb-0.5">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-[#6366F1]" />
              <p className="text-sm text-[#6366F1] font-bold">~{oneRM}kg</p>
            </div>
            <p className="text-[10px] text-[#555555]">est. 1RM</p>
          </div>
        )}
      </div>

      <p className="text-xs text-[#555555] mt-2">{date}</p>
      {notes && <p className="text-xs text-[#888888] mt-1 italic">{notes}</p>}
    </div>
  );
}
