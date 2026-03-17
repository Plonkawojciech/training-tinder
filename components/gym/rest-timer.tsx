'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Timer } from 'lucide-react';

interface RestTimerProps {
  defaultSeconds?: number;
}

const PRESETS = [30, 60, 90, 120, 180];

export function RestTimer({ defaultSeconds = 90 }: RestTimerProps) {
  const [totalSeconds, setTotalSeconds] = useState(defaultSeconds);
  const [remaining, setRemaining] = useState(defaultSeconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            setRunning(false);
            if (intervalRef.current) clearInterval(intervalRef.current);
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  function reset() {
    setRunning(false);
    setRemaining(totalSeconds);
  }

  function selectPreset(seconds: number) {
    setTotalSeconds(seconds);
    setRemaining(seconds);
    setRunning(false);
  }

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = totalSeconds > 0 ? (remaining / totalSeconds) * 100 : 100;

  const circumference = 2 * Math.PI * 28;
  const strokeDashoffset = circumference * (1 - progress / 100);

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Timer className="w-4 h-4 text-[#6366F1]" />
        <span className="text-xs font-semibold uppercase tracking-wider text-[#888888]">
          Zegar odpoczynku
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Circle progress */}
        <div className="relative w-16 h-16 shrink-0">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="none" stroke="#1A1A1A" strokeWidth="4" />
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke={remaining === 0 ? '#00CC44' : '#6366F1'}
              strokeWidth="4"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="square"
              style={{ transition: 'stroke-dashoffset 0.5s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-sm text-white">
              {minutes}:{seconds.toString().padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={() => setRunning((r) => !r)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#6366F1] text-white text-xs font-semibold uppercase tracking-wider hover:shadow-[0_0_12px_rgba(99,102,241,0.4)] transition-all"
            >
              {running ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {running ? 'Pauza' : 'Start'}
            </button>
            <button
              type="button"
              onClick={reset}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[var(--border)] text-[#888888] text-xs hover:text-white hover:border-[#6366F1] transition-all"
            >
              <RotateCcw className="w-3 h-3" />
              Resetuj
            </button>
          </div>
          <div className="flex gap-1">
            {PRESETS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => selectPreset(s)}
                className="px-2 py-1 text-[10px] border transition-all"
                style={
                  totalSeconds === s
                    ? { borderColor: '#6366F1', color: '#6366F1', background: 'rgba(99,102,241,0.1)' }
                    : { borderColor: '#2A2A2A', color: '#555555', background: 'transparent' }
                }
              >
                {s < 60 ? `${s}s` : `${s / 60}m`}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
