'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { getSportLabel } from '@/lib/utils';

interface CalendarSession {
  id: number;
  title: string;
  sportType: string;
  date: string;
  time: string;
  location: string;
  status: string;
}

interface WeekViewProps {
  sessions: CalendarSession[];
  onSessionClick?: (id: number) => void;
}

export function WeekView({ sessions, onSessionClick }: WeekViewProps) {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  function getSessionsForDay(day: Date): CalendarSession[] {
    return sessions.filter((s) => {
      const sessionDate = new Date(s.date);
      return isSameDay(sessionDate, day);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setWeekStart((w) => subWeeks(w, 1))}
          className="p-2 text-[#888888] hover:text-white hover:bg-[var(--bg-elevated)] transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="font-display text-lg text-white tracking-wider">
          {format(weekStart, 'MMM d')} — {format(addDays(weekStart, 6), 'MMM d, yyyy')}
        </h2>
        <button
          onClick={() => setWeekStart((w) => addWeeks(w, 1))}
          className="p-2 text-[#888888] hover:text-white hover:bg-[var(--bg-elevated)] transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => (
          <div
            key={day.toString()}
            className="text-center pb-2 border-b border-[var(--border)]"
          >
            <p className="text-[10px] text-[#888888] uppercase tracking-wider">
              {format(day, 'EEE')}
            </p>
            <p
              className={`text-sm font-semibold mt-0.5 ${
                isSameDay(day, today) ? 'text-[#7C3AED]' : 'text-white'
              }`}
            >
              {format(day, 'd')}
            </p>
          </div>
        ))}
      </div>

      {/* Day columns */}
      <div className="grid grid-cols-7 gap-1 min-h-[400px]">
        {days.map((day) => {
          const daySessions = getSessionsForDay(day);
          const isToday = isSameDay(day, today);

          return (
            <div
              key={day.toString()}
              className={`bg-[var(--bg-card)] border p-2 min-h-[120px] ${
                isToday ? 'border-t-2 border-t-[#7C3AED] border-x-[var(--border)] border-b-[var(--border)]' : 'border-[var(--border)]'
              }`}
            >
              {daySessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => onSessionClick?.(session.id)}
                  className="w-full text-left mb-1 p-1.5 bg-[var(--bg-elevated)] border border-[var(--border)] hover:border-[#7C3AED] transition-colors group"
                >
                  <p className="text-[10px] text-white font-medium line-clamp-1 group-hover:text-[#7C3AED] transition-colors">
                    {session.title}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[9px] text-[#888888]">{session.time}</span>
                    <Badge sport={session.sportType} className="text-[8px] px-1 py-0">
                      {getSportLabel(session.sportType).slice(0, 3)}
                    </Badge>
                  </div>
                </button>
              ))}
              {daySessions.length === 0 && (
                <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className="text-[10px] text-[#444444]">—</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
