'use client';

import React, { useState, useEffect } from 'react';
import { paceSecToMinKm, paceSecToKmh, kmhToPaceSec, minKmToPaceSec } from '@/lib/utils';

export interface PaceInputProps {
  valueSec: number | null; // stored as seconds/km
  onChange: (sec: number) => void;
  label?: string;
  className?: string;
}

type PaceUnit = 'min_km' | 'km_h';

export function PaceInput({ valueSec, onChange, label, className }: PaceInputProps) {
  const [unit, setUnit] = useState<PaceUnit>('min_km');
  const [minKmStr, setMinKmStr] = useState('');
  const [kmhStr, setKmhStr] = useState('');

  // Load preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pace_unit') as PaceUnit | null;
      if (saved === 'min_km' || saved === 'km_h') setUnit(saved);
    } catch {
      // ignore
    }
  }, []);

  // Sync display values when valueSec changes externally
  useEffect(() => {
    if (valueSec && valueSec > 0) {
      setMinKmStr(paceSecToMinKm(valueSec));
      setKmhStr(String(paceSecToKmh(valueSec)));
    }
  }, [valueSec]);

  function switchUnit(newUnit: PaceUnit) {
    setUnit(newUnit);
    try {
      localStorage.setItem('pace_unit', newUnit);
    } catch {
      // ignore
    }
  }

  function handleMinKmChange(val: string) {
    setMinKmStr(val);
    // parse on valid format e.g. "5:30"
    if (/^\d{1,2}:\d{0,2}$/.test(val) && val.endsWith(':') === false) {
      const sec = minKmToPaceSec(val);
      if (sec > 0) {
        onChange(sec);
        setKmhStr(String(paceSecToKmh(sec)));
      }
    } else if (/^\d{1,2}$/.test(val)) {
      // user typing minutes only
      const sec = parseInt(val) * 60;
      if (sec > 0) {
        onChange(sec);
        setKmhStr(String(paceSecToKmh(sec)));
      }
    }
  }

  function handleKmhChange(val: string) {
    setKmhStr(val);
    const kmh = parseFloat(val);
    if (!isNaN(kmh) && kmh > 0) {
      const sec = kmhToPaceSec(kmh);
      onChange(sec);
      setMinKmStr(paceSecToMinKm(sec));
    }
  }

  return (
    <div className={className}>
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-2">
          {label}
        </label>
      )}
      {/* Toggle */}
      <div className="flex items-center gap-0 mb-2 w-fit">
        <button
          type="button"
          onClick={() => switchUnit('min_km')}
          className="px-3 py-1 text-xs font-semibold transition-all border-r-0"
          style={
            unit === 'min_km'
              ? { background: '#6366F1', color: 'white', border: '1px solid #6366F1' }
              : { background: 'transparent', color: '#888888', border: '1px solid #2A2A2A' }
          }
        >
          min/km
        </button>
        <button
          type="button"
          onClick={() => switchUnit('km_h')}
          className="px-3 py-1 text-xs font-semibold transition-all"
          style={
            unit === 'km_h'
              ? { background: '#6366F1', color: 'white', border: '1px solid #6366F1' }
              : { background: 'transparent', color: '#888888', border: '1px solid #2A2A2A' }
          }
        >
          km/h
        </button>
      </div>

      {unit === 'min_km' ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="5:30"
            value={minKmStr}
            onChange={(e) => handleMinKmChange(e.target.value)}
            className="w-24 bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none text-center"
          />
          <span className="text-[#888888] text-sm">/km</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="19.4"
            step="0.1"
            min="1"
            max="100"
            value={kmhStr}
            onChange={(e) => handleKmhChange(e.target.value)}
            className="w-24 bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none text-center"
          />
          <span className="text-[#888888] text-sm">km/h</span>
        </div>
      )}

      {valueSec && valueSec > 0 && (
        <p className="text-xs text-[#555555] mt-1">
          {unit === 'min_km'
            ? `= ${paceSecToKmh(valueSec)} km/h`
            : `= ${paceSecToMinKm(valueSec)} /km`}
        </p>
      )}
    </div>
  );
}
