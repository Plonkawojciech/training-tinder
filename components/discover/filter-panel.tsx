'use client';

import { useState, useEffect } from 'react';
import { SlidersHorizontal, X, ChevronDown, BadgeCheck } from 'lucide-react';
import { PaceInput } from '@/components/ui/pace-input';
import { SportFilter } from '@/components/athletes/sport-filter';

export interface DiscoverFilters {
  sport: string;
  level: string; // '' | 'beginner' | 'recreational' | 'competitive' | 'elite'
  minPace: number | null; // sec/km
  maxPace: number | null; // sec/km
  minWeeklyKm: number | null;
  maxWeeklyKm: number | null;
  verified: boolean;
}

export const DEFAULT_FILTERS: DiscoverFilters = {
  sport: 'cycling',
  level: '',
  minPace: null,
  maxPace: null,
  minWeeklyKm: null,
  maxWeeklyKm: null,
  verified: false,
};

interface FilterPanelProps {
  filters: DiscoverFilters;
  onChange: (f: DiscoverFilters) => void;
  onApply: () => void;
  onReset: () => void;
}

const LEVELS = [
  { value: 'beginner', label: 'Początkujący', color: '#00CC44' },
  { value: 'recreational', label: 'Rekreacyjny', color: '#FFD700' },
  { value: 'competitive', label: 'Wyczynowy', color: '#A78BFA' },
  { value: 'elite', label: 'Elita', color: '#6366F1' },
];

export function FilterPanel({ filters, onChange, onApply, onReset }: FilterPanelProps) {
  const [open, setOpen] = useState(false);
  const [isBottomSheet, setIsBottomSheet] = useState(false);

  useEffect(() => {
    const check = () => setIsBottomSheet(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const activeCount = [
    filters.sport !== 'all',
    filters.level !== '',
    filters.minPace !== null || filters.maxPace !== null,
    filters.minWeeklyKm !== null || filters.maxWeeklyKm !== null,
    filters.verified,
  ].filter(Boolean).length;

  function update(partial: Partial<DiscoverFilters>) {
    onChange({ ...filters, ...partial });
  }

  const content = (
    <div className="flex flex-col gap-5 p-4">
      {/* Sport */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-2">
          Dyscyplina
        </label>
        <SportFilter selected={filters.sport} onChange={(s) => update({ sport: s })} />
      </div>

      {/* Athlete Level */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-2">
          Poziom zawodnika
        </label>
        <div className="grid grid-cols-2 gap-2">
          {LEVELS.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => update({ level: filters.level === l.value ? '' : l.value })}
              className="px-3 py-2 border text-xs font-semibold uppercase tracking-wider transition-all"
              style={
                filters.level === l.value
                  ? { borderColor: l.color, background: `${l.color}20`, color: l.color }
                  : { borderColor: '#2A2A2A', background: 'transparent', color: '#888888' }
              }
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pace Range */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-2">
          Zakres tempa
        </label>
        <div className="flex flex-col gap-3">
          <PaceInput
            valueSec={filters.minPace}
            onChange={(sec) => update({ minPace: sec })}
            label="Min. tempo (najwolniejsze)"
          />
          <PaceInput
            valueSec={filters.maxPace}
            onChange={(sec) => update({ maxPace: sec })}
            label="Maks. tempo (najszybsze)"
          />
          {(filters.minPace || filters.maxPace) && (
            <button
              type="button"
              className="text-xs text-[#888888] hover:text-[#6366F1] text-left"
              onClick={() => update({ minPace: null, maxPace: null })}
            >
              Wyczyść filtr tempa
            </button>
          )}
        </div>
      </div>

      {/* Weekly Distance */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-2">
          Tygodniowy dystans (km)
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={0}
            max={500}
            placeholder="Min"
            value={filters.minWeeklyKm ?? ''}
            onChange={(e) => update({ minWeeklyKm: e.target.value ? parseInt(e.target.value) : null })}
            className="w-24 bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none text-center"
          />
          <span className="text-[#444444] text-sm">—</span>
          <input
            type="number"
            min={0}
            max={2000}
            placeholder="Max"
            value={filters.maxWeeklyKm ?? ''}
            onChange={(e) => update({ maxWeeklyKm: e.target.value ? parseInt(e.target.value) : null })}
            className="w-24 bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none text-center"
          />
          <span className="text-[#888888] text-sm">km</span>
        </div>
      </div>

      {/* Strava Verified */}
      <div>
        <button
          type="button"
          onClick={() => update({ verified: !filters.verified })}
          className="flex items-center gap-3 w-full group"
        >
          <div
            className="w-10 h-6 rounded-full transition-all flex items-center px-1"
            style={{
              background: filters.verified ? '#6366F1' : '#2A2A2A',
            }}
          >
            <div
              className="w-4 h-4 bg-white rounded-full transition-all"
              style={{ transform: filters.verified ? 'translateX(16px)' : 'translateX(0)' }}
            />
          </div>
          <div className="flex items-center gap-2">
            <BadgeCheck className="w-4 h-4 text-[#FF6334]" />
            <span className="text-sm text-white font-medium">Tylko zweryfikowani Stravą</span>
          </div>
        </button>
        <p className="text-xs text-[#444444] mt-1 ml-13">
          Pokaż tylko sportowców połączonych ze Stravą
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2 border-t border-[var(--border)]">
        <button
          type="button"
          onClick={() => {
            onReset();
            setOpen(false);
          }}
          className="flex-1 h-10 border border-[var(--border)] text-[#888888] hover:text-white hover:border-[#6366F1] text-xs font-semibold uppercase tracking-wider transition-all"
        >
          Resetuj
        </button>
        <button
          type="button"
          onClick={() => {
            onApply();
            setOpen(false);
          }}
          className="flex-1 h-10 bg-[#6366F1] text-white text-xs font-semibold uppercase tracking-wider hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all"
        >
          Zastosuj filtry
        </button>
      </div>
    </div>
  );

  // Desktop: collapsible sidebar panel
  if (!isBottomSheet) {
    return (
      <div className="w-full">
        {/* Filter toggle button */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-4 py-2 border border-[var(--border)] text-[#888888] hover:text-white hover:border-[#6366F1] text-xs font-semibold uppercase tracking-wider transition-all mb-3"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filtry
          {activeCount > 0 && (
            <span className="bg-[#6366F1] text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {activeCount}
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="border border-[var(--border)] bg-[var(--bg-card)] mb-6">
            {content}
          </div>
        )}
      </div>
    );
  }

  // Mobile: bottom sheet
  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 border border-[var(--border)] text-[#888888] hover:text-white hover:border-[#6366F1] text-xs font-semibold uppercase tracking-wider transition-all"
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        Filtry
        {activeCount > 0 && (
          <span className="bg-[#6366F1] text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
            {activeCount}
          </span>
        )}
      </button>

      {/* Bottom sheet overlay */}
      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-card)] border-t border-[var(--border)] max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <h2 className="font-display text-lg text-white tracking-wider">FILTRY</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[#888888] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {content}
          </div>
        </>
      )}
    </>
  );
}
