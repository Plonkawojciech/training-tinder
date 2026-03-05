'use client';

import { SPORTS, getSportColor } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface SportFilterProps {
  selected: string;
  onChange: (sport: string) => void;
}

export function SportFilter({ selected, onChange }: SportFilterProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
      <button
        onClick={() => onChange('all')}
        className={cn(
          'flex-shrink-0 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider border transition-all',
          selected === 'all'
            ? 'bg-[#FF4500] text-white border-[#FF4500]'
            : 'bg-transparent border-[#2A2A2A] text-[#888888] hover:border-[#888888] hover:text-white'
        )}
      >
        All Sports
      </button>
      {SPORTS.map((sport) => {
        const color = getSportColor(sport.value);
        const isActive = selected === sport.value;
        return (
          <button
            key={sport.value}
            onClick={() => onChange(sport.value)}
            className="flex-shrink-0 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider border transition-all"
            style={
              isActive
                ? { background: color, color: '#000', borderColor: color }
                : {
                    background: `${color}10`,
                    color,
                    borderColor: `${color}30`,
                  }
            }
          >
            {sport.label}
          </button>
        );
      })}
    </div>
  );
}
