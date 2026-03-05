'use client';

export const dynamic = 'force-dynamic';

import nextDynamic from 'next/dynamic';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, MapPin, Users, Clock, Download, ArrowLeft, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { getSportLabel } from '@/lib/utils';
import { useSafeUser } from '@/lib/auth';

interface Participant {
  userId: string;
  clerkId: string;
  username: string | null;
  avatarUrl: string | null;
  joinedAt: string;
}

interface SessionDetail {
  id: number;
  creatorId: string;
  title: string;
  sportType: string;
  date: string;
  time: string;
  location: string;
  maxParticipants: number;
  gpxUrl: string | null;
  description: string | null;
  status: string;
  participants: Participant[];
  participantCount: number;
  creatorName: string | null;
  creatorAvatar: string | null;
}

function SessionDetailPageInner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const user = useSafeUser();
  const router = useRouter();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function fetchSession() {
    try {
      const res = await fetch(`/api/sessions/${id}`);
      if (res.ok) {
        const data: SessionDetail = await res.json();
        setSession(data);
      } else {
        router.push('/sessions');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    setJoining(true);
    setMessage('');
    try {
      const res = await fetch(`/api/sessions/${id}/join`, { method: 'POST' });
      const data = await res.json() as { success?: boolean; error?: string };
      if (res.ok) {
        setMessage('Joined successfully!');
        fetchSession();
      } else {
        setMessage(data.error ?? 'Failed to join');
      }
    } finally {
      setJoining(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this session?')) return;
    setDeleting(true);
    try {
      await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
      router.push('/sessions');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#FF4500] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  const isCreator = user.id === session.creatorId;
  const isParticipant = session.participants.some((p) => p.userId === user.id);
  const isFull = session.participantCount >= session.maxParticipants;
  const fillPct = Math.min(100, (session.participantCount / session.maxParticipants) * 100);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Back */}
      <Link
        href="/sessions"
        className="inline-flex items-center gap-2 text-[#888888] hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Sessions
      </Link>

      {/* Main card */}
      <div className="bg-[#111111] border border-[#2A2A2A] p-6 mb-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge sport={session.sportType}>{getSportLabel(session.sportType)}</Badge>
              {session.status === 'cancelled' && (
                <Badge variant="outline" className="border-red-500 text-red-400">Cancelled</Badge>
              )}
            </div>
            <h1 className="font-display text-3xl text-white tracking-wider">{session.title}</h1>
          </div>

          {isCreator && (
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              loading={deleting}
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          )}
        </div>

        {session.description && (
          <p className="text-[#888888] text-sm leading-relaxed mb-6">{session.description}</p>
        )}

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#FF4500]" />
            <span className="text-sm text-white">{session.date}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#FF4500]" />
            <span className="text-sm text-white">{session.time}</span>
          </div>
          <div className="flex items-center gap-2 col-span-2">
            <MapPin className="w-4 h-4 text-[#FF4500] shrink-0" />
            <span className="text-sm text-white">{session.location}</span>
          </div>
        </div>

        {/* Participants bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#888888]" />
              <span className="text-sm text-[#888888]">
                {session.participantCount}/{session.maxParticipants} athletes
              </span>
            </div>
            <span
              className="text-sm font-semibold"
              style={{ color: isFull ? '#888888' : '#FF4500' }}
            >
              {isFull ? 'Full' : `${session.maxParticipants - session.participantCount} spots left`}
            </span>
          </div>
          <div className="h-1.5 bg-[#1A1A1A]">
            <div
              className="h-full transition-all"
              style={{ width: `${fillPct}%`, background: isFull ? '#888888' : '#FF4500' }}
            />
          </div>
        </div>

        {/* GPX download */}
        {session.gpxUrl && (
          <a
            href={session.gpxUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-[#FF4500] hover:underline mb-6"
          >
            <Download className="w-4 h-4" />
            Download GPX Route
          </a>
        )}

        {/* Join button */}
        {!isCreator && session.status !== 'cancelled' && (
          <div>
            {message && (
              <p
                className="text-sm mb-3"
                style={{ color: message.includes('success') ? '#00CC44' : '#ef4444' }}
              >
                {message}
              </p>
            )}
            {isParticipant ? (
              <div className="flex items-center gap-2 text-[#00CC44] text-sm">
                <span>✓</span> You're attending this session
              </div>
            ) : (
              <Button onClick={handleJoin} loading={joining} disabled={isFull}>
                {isFull ? 'Session Full' : 'Join Session'}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Creator */}
      <div className="bg-[#111111] border border-[#2A2A2A] p-4 mb-4">
        <h2 className="font-display text-sm text-[#888888] tracking-wider mb-3">ORGANIZED BY</h2>
        <div className="flex items-center gap-3">
          <Avatar src={session.creatorAvatar} fallback={session.creatorName ?? '?'} size="md" />
          <Link
            href={`/profile/${session.creatorId}`}
            className="font-semibold text-white hover:text-[#FF4500] transition-colors text-sm"
          >
            {session.creatorName ?? 'Unknown'}
          </Link>
        </div>
      </div>

      {/* Participants list */}
      <div className="bg-[#111111] border border-[#2A2A2A] p-4">
        <h2 className="font-display text-sm text-[#888888] tracking-wider mb-3">
          PARTICIPANTS ({session.participantCount})
        </h2>
        <div className="flex flex-col gap-2">
          {session.participants.map((p) => (
            <Link
              key={p.userId}
              href={`/profile/${p.userId}`}
              className="flex items-center gap-3 hover:bg-[#1A1A1A] p-2 -mx-2 transition-colors"
            >
              <Avatar src={p.avatarUrl} fallback={p.username ?? '?'} size="sm" />
              <span className="text-sm text-white">{p.username ?? 'Anonymous'}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default nextDynamic(() => Promise.resolve({ default: SessionDetailPageInner }), { ssr: false });
