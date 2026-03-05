'use client';

import { Trophy } from 'lucide-react';
import { epley1RM } from '@/lib/utils';

interface Big4PR {
  exerciseName: string;
  weightKg: number;
  reps: number;
}

interface Big4DisplayProps {
  records: Big4PR[];
}

const BIG4 = ['Bench Press', 'Squat', 'Deadlift', 'Overhead Press'];
const BIG4_SHORT = ['Bench', 'Squat', 'Deadlift', 'OHP'];

export function Big4Display({ records }: Big4DisplayProps) {
  const recordMap = new Map(records.map((r) => [r.exerciseName, r]));

  return (
    <div className="bg-[#111111] border border-[#2A2A2A] p-4">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-4 h-4 text-[#FFD700]" />
        <h3 className="font-display text-sm text-[#888888] tracking-wider">BIG 4 LIFTS</h3>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {BIG4.map((lift, i) => {
          const pr = recordMap.get(lift);
          const oneRM = pr ? epley1RM(pr.weightKg, pr.reps) : null;
          return (
            <div key={lift} className="text-center">
              <div
                className="w-full aspect-square flex flex-col items-center justify-center border mb-2"
                style={{
                  borderColor: pr ? 'rgba(255,69,0,0.4)' : '#1A1A1A',
                  background: pr ? 'rgba(255,69,0,0.06)' : '#0D0D0D',
                }}
              >
                {pr ? (
                  <>
                    <p className="font-display text-lg text-white leading-none">{pr.weightKg}</p>
                    <p className="text-[10px] text-[#888888]">kg</p>
                    {oneRM && pr.reps > 1 && (
                      <p className="text-[9px] text-[#FF4500] mt-1">~{oneRM} 1RM</p>
                    )}
                  </>
                ) : (
                  <p className="text-xl text-[#333333]">—</p>
                )}
              </div>
              <p className="text-[10px] text-[#888888] uppercase tracking-wider">{BIG4_SHORT[i]}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
