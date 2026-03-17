'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Calendar } from 'lucide-react';
import { WeekView } from '@/components/calendar/week-view';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface CalSession {
  id: number;
  title: string;
  sportType: string;
  date: string;
  time: string;
  location: string;
  status: string;
}

export default function CalendarPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<CalSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSessions() {
      try {
        const res = await fetch('/api/sessions');
        if (res.ok) {
          const data: CalSession[] = await res.json();
          setSessions(data);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchSessions();
  }, []);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-[#6366F1]" />
          <div>
            <h1 className="font-display text-3xl text-white tracking-wider">KALENDARZ</h1>
            <p className="text-[#888888] text-sm">Twój tygodniowy plan treningowy</p>
          </div>
        </div>
        <Link href="/sessions/new">
          <Button size="sm">
            <Plus className="w-4 h-4" />
            Nowa sesja
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <WeekView
          sessions={sessions}
          onSessionClick={(id) => router.push(`/sessions/${id}`)}
        />
      )}

      {/* Upcoming sessions */}
      <div className="mt-8">
        <h2 className="font-display text-xl text-white tracking-wider mb-4">NADCHODZĄCE SESJE</h2>
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <p className="text-[#888888] text-sm">Brak zaplanowanych sesji</p>
            <Link href="/sessions/new">
              <Button size="sm" variant="outline">
                <Plus className="w-4 h-4" />
                Zaplanuj sesję
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
                  <p className="text-sm font-semibold text-white mb-1">{session.title}</p>
                  <p className="text-xs text-[#888888]">{session.date} o {session.time}</p>
                  <p className="text-xs text-[#888888]">{session.location}</p>
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
