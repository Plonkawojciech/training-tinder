'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Dumbbell } from 'lucide-react';
import { SessionCard } from '@/components/sessions/session-card';
import { SportFilter } from '@/components/athletes/sport-filter';
import { Button } from '@/components/ui/button';

interface SessionData {
  id: number;
  title: string;
  sportType: string;
  date: string;
  time: string;
  location: string;
  maxParticipants: number;
  participantCount: number;
  description: string | null;
  status: string;
  creatorName: string | null;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sport, setSport] = useState('all');
  const [tab, setTab] = useState<'all' | 'mine'>('all');

  useEffect(() => {
    async function fetch_() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (sport !== 'all') params.set('sport', sport);
        if (tab === 'mine') params.set('mine', 'true');
        const res = await fetch(`/api/sessions?${params.toString()}`);
        if (res.ok) {
          const data: SessionData[] = await res.json();
          setSessions(data);
        }
      } finally {
        setLoading(false);
      }
    }
    fetch_();
  }, [sport, tab]);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-white tracking-wider">SESSIONS</h1>
          <p className="text-[#888888] text-sm mt-1">{sessions.length} training sessions</p>
        </div>
        <Link href="/sessions/new">
          <Button>
            <Plus className="w-4 h-4" />
            New Session
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 mb-6 border-b border-[#2A2A2A]">
        {(['all', 'mine'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-6 py-3 text-xs font-semibold uppercase tracking-wider transition-all border-b-2"
            style={
              tab === t
                ? { color: '#FF4500', borderColor: '#FF4500' }
                : { color: '#888888', borderColor: 'transparent' }
            }
          >
            {t === 'all' ? 'All Sessions' : 'My Sessions'}
          </button>
        ))}
      </div>

      {/* Sport filter */}
      <div className="mb-6">
        <SportFilter selected={sport} onChange={setSport} />
      </div>

      {/* Sessions grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 skeleton" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Dumbbell className="w-12 h-12 text-[#2A2A2A]" />
          <h3 className="font-display text-xl text-[#888888]">NO SESSIONS YET</h3>
          <p className="text-[#888888] text-sm">
            {tab === 'mine' ? "You haven't created any sessions." : 'Be the first to create a training session!'}
          </p>
          <Link href="/sessions/new">
            <Button>
              <Plus className="w-4 h-4" />
              Create Session
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((session) => (
            <SessionCard key={session.id} {...session} />
          ))}
        </div>
      )}
    </div>
  );
}
