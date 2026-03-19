'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { WeekView } from '@/components/calendar/week-view';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useLang } from '@/lib/lang';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
} from 'date-fns';

/* ---------- types ---------- */

interface CalSession {
  id: number;
  title: string;
  sportType: string;
  date: string;
  time: string;
  location: string;
  status: string;
}

interface CalWorkout {
  id: number;
  name: string;
  type: string;
  date: string;
  durationMin: number | null;
}

interface CalEvent {
  id: number;
  eventName: string;
  eventType: string;
  sport: string;
  eventDate: string;
  location: string | null;
}

type CalendarItemType = 'session' | 'workout' | 'event';

interface CalendarItem {
  id: number;
  label: string;
  date: string;
  itemType: CalendarItemType;
  meta?: string;
}

type ViewMode = 'week' | 'month';

/* ---------- color helpers ---------- */

/** Color for the dot / left border based on item type */
function getItemColor(itemType: CalendarItemType): string {
  switch (itemType) {
    case 'session':
      return '#3B82F6'; // blue
    case 'workout':
      return '#22C55E'; // green
    case 'event':
      return '#EF4444'; // red
    default:
      return '#6366F1';
  }
}

function getItemBgClass(itemType: CalendarItemType): string {
  switch (itemType) {
    case 'session':
      return 'bg-blue-500/15 border-l-blue-500';
    case 'workout':
      return 'bg-green-500/15 border-l-green-500';
    case 'event':
      return 'bg-red-500/15 border-l-red-500';
    default:
      return 'bg-indigo-500/15 border-l-indigo-500';
  }
}

const ITEM_TYPE_LABELS: Record<CalendarItemType, string> = {
  session: 'cal_sessions',
  workout: 'cal_workouts',
  event: 'cal_events',
};

/* ---------- component ---------- */

export default function CalendarPage() {
  const router = useRouter();
  const { t } = useLang();

  const [sessions, setSessions] = useState<CalSession[]>([]);
  const [workouts, setWorkouts] = useState<CalWorkout[]>([]);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  /* ---- data fetching ---- */
  useEffect(() => {
    async function fetchAll() {
      try {
        const [sessRes, workRes, evtRes] = await Promise.all([
          fetch('/api/sessions'),
          fetch('/api/workouts?mine=true&limit=200'),
          fetch('/api/events?public=false'),
        ]);

        if (sessRes.ok) {
          const data: CalSession[] = await sessRes.json();
          setSessions(data);
        }
        if (workRes.ok) {
          const data: CalWorkout[] = await workRes.json();
          setWorkouts(data);
        }
        if (evtRes.ok) {
          const data = await evtRes.json();
          setEvents(data.myEvents ?? []);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  /* ---- unified calendar items ---- */
  const allItems: CalendarItem[] = useMemo(() => {
    const items: CalendarItem[] = [];

    for (const s of sessions) {
      items.push({
        id: s.id,
        label: s.title,
        date: s.date,
        itemType: 'session',
        meta: s.time ? `${s.time}${s.location ? ' · ' + s.location : ''}` : s.location,
      });
    }
    for (const w of workouts) {
      items.push({
        id: w.id,
        label: w.name,
        date: w.date,
        itemType: 'workout',
        meta: w.durationMin ? `${w.durationMin} min` : undefined,
      });
    }
    for (const e of events) {
      items.push({
        id: e.id,
        label: e.eventName,
        date: e.eventDate,
        itemType: 'event',
        meta: e.location ?? undefined,
      });
    }

    return items;
  }, [sessions, workouts, events]);

  function getItemsForDay(day: Date): CalendarItem[] {
    return allItems.filter((item) => {
      const d = new Date(item.date);
      return isSameDay(d, day);
    });
  }

  /* ---- month grid calculation ---- */
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const monthDays: Date[] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    monthDays.push(cursor);
    cursor = addDays(cursor, 1);
  }

  const today = new Date();

  /* ---- selected day items ---- */
  const selectedDayItems = selectedDay ? getItemsForDay(selectedDay) : [];

  /* ---- handle item click ---- */
  function handleItemClick(item: CalendarItem) {
    if (item.itemType === 'session') {
      router.push(`/sessions/${item.id}`);
    }
    // workouts and events don't have detail pages from the calendar yet
  }

  /* ---- day names ---- */
  const dayNames = Array.from({ length: 7 }, (_, i) =>
    format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), i), 'EEE')
  );

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-[#6366F1]" />
          <div>
            <h1 className="font-display text-3xl text-white tracking-wider">{t('calendar_title')}</h1>
            <p className="text-[#888888] text-sm">{t('calendar_subtitle')}</p>
          </div>
        </div>
        <Link href="/sessions/new">
          <Button size="sm">
            <Plus className="w-4 h-4" />
            {t('calendar_new_session')}
          </Button>
        </Link>
      </div>

      {/* View toggle + Legend */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        {/* Week / Month toggle */}
        <div className="flex bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('week')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              viewMode === 'week'
                ? 'bg-[#6366F1] text-white'
                : 'text-[#888888] hover:text-white'
            }`}
          >
            {t('cal_week_view')}
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              viewMode === 'month'
                ? 'bg-[#6366F1] text-white'
                : 'text-[#888888] hover:text-white'
            }`}
          >
            {t('cal_month_view')}
          </button>
        </div>

        {/* Color legend */}
        <div className="flex items-center gap-4 text-xs text-[#888888]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
            {t('cal_sessions')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
            {t('cal_workouts')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
            {t('cal_events')}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : viewMode === 'week' ? (
        <WeekView
          sessions={sessions}
          onSessionClick={(id) => router.push(`/sessions/${id}`)}
        />
      ) : (
        /* ---- MONTH VIEW ---- */
        <div className="flex flex-col gap-2">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
              className="p-2 text-[#888888] hover:text-white hover:bg-[var(--bg-elevated)] transition-colors rounded"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="font-display text-lg text-white tracking-wider">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <button
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
              className="p-2 text-[#888888] hover:text-white hover:bg-[var(--bg-elevated)] transition-colors rounded"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 gap-1">
            {dayNames.map((name) => (
              <div
                key={name}
                className="text-center pb-2 border-b border-[var(--border)]"
              >
                <p className="text-[10px] text-[#888888] uppercase tracking-wider">
                  {name}
                </p>
              </div>
            ))}
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((day) => {
              const dayItems = getItemsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, today);
              const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`relative min-h-[80px] md:min-h-[100px] p-1.5 text-left transition-colors border ${
                    isSelected
                      ? 'border-[#6366F1] bg-[#6366F1]/10'
                      : isToday
                        ? 'border-t-2 border-t-[#6366F1] border-x-[var(--border)] border-b-[var(--border)] bg-[var(--bg-card)]'
                        : 'border-[var(--border)] bg-[var(--bg-card)]'
                  } ${!isCurrentMonth ? 'opacity-40' : ''} hover:border-[#6366F1]/50`}
                >
                  {/* Day number */}
                  <span
                    className={`text-xs font-semibold ${
                      isToday
                        ? 'text-[#6366F1]'
                        : isCurrentMonth
                          ? 'text-white'
                          : 'text-[#555555]'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>

                  {/* Event dots / compact items */}
                  <div className="mt-1 flex flex-col gap-0.5">
                    {dayItems.slice(0, 3).map((item) => (
                      <div
                        key={`${item.itemType}-${item.id}`}
                        className="flex items-center gap-1 min-w-0"
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: getItemColor(item.itemType) }}
                        />
                        <span className="text-[9px] md:text-[10px] text-white truncate leading-tight">
                          {item.label}
                        </span>
                      </div>
                    ))}
                    {dayItems.length > 3 && (
                      <span className="text-[8px] text-[#888888] pl-2.5">
                        +{dayItems.length - 3}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected day detail panel */}
          {selectedDay && (
            <div className="mt-4 bg-[var(--bg-card)] border border-[var(--border)] p-4 rounded">
              <h3 className="font-display text-sm text-white tracking-wider mb-3">
                {t('cal_selected_day')} — {format(selectedDay, 'EEEE, d MMMM yyyy')}
              </h3>

              {selectedDayItems.length === 0 ? (
                <p className="text-sm text-[#888888] py-4 text-center">
                  {t('cal_no_events')}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {selectedDayItems.map((item) => (
                    <button
                      key={`${item.itemType}-${item.id}`}
                      onClick={() => handleItemClick(item)}
                      className={`text-left p-3 border-l-2 rounded-r transition-colors hover:brightness-125 ${getItemBgClass(item.itemType)}`}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: getItemColor(item.itemType) }}
                        />
                        <span className="text-[10px] uppercase tracking-wider font-medium"
                          style={{ color: getItemColor(item.itemType) }}
                        >
                          {t(ITEM_TYPE_LABELS[item.itemType] as Parameters<typeof t>[0])}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-white ml-4">
                        {item.label}
                      </p>
                      {item.meta && (
                        <p className="text-xs text-[#888888] ml-4">{item.meta}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Floating action button — new session */}
      <Link
        href="/sessions/new"
        aria-label={t('calendar_new_session')}
        style={{
          position: 'fixed',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
          right: 20,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: '#6366F1',
          border: 'none',
          boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 50,
          textDecoration: 'none',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        title={t('calendar_new_session')}
      >
        <Plus style={{ width: 28, height: 28, color: 'white' }} />
      </Link>

      {/* Upcoming sessions */}
      <div className="mt-8">
        <h2 className="font-display text-xl text-white tracking-wider mb-4">{t('calendar_upcoming')}</h2>
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <p className="text-[#888888] text-sm">{t('calendar_no_sessions')}</p>
            <Link href="/sessions/new">
              <Button size="sm" variant="outline">
                <Plus className="w-4 h-4" />
                {t('calendar_plan_session')}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sessions
              .filter((s) => s.date >= new Date().toISOString().slice(0, 10))
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .slice(0, 6)
              .map((session) => (
                <button
                  key={session.id}
                  onClick={() => router.push(`/sessions/${session.id}`)}
                  className="text-left bg-[var(--bg-card)] border border-[var(--border)] p-4 card-hover"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    <p className="text-sm font-semibold text-white">{session.title}</p>
                  </div>
                  <p className="text-xs text-[#888888] ml-4">{session.date} o {session.time}</p>
                  <p className="text-xs text-[#888888] ml-4">{session.location}</p>
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
