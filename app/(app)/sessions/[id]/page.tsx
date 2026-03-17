'use client';

export const dynamic = 'force-dynamic';

import nextDynamic from 'next/dynamic';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, MapPin, Users, Clock, Download, ArrowLeft, Trash2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { getSportLabel } from '@/lib/utils';
import { useSafeUser } from '@/lib/auth';
import { ReviewModal } from '@/components/reviews/review-modal';

const GroupChat = nextDynamic(
  () => import('@/components/sessions/group-chat').then((m) => m.GroupChat),
  { ssr: false, loading: () => <div className="h-96 skeleton rounded-3xl" /> }
);

interface Participant {
  userId: string;
  clerkId: string;
  username: string | null;
  avatarUrl: string | null;
  joinedAt: string;
  status: string;
}

interface Stop {
  name: string;
  location: string;
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
  // Cycling/Running fields
  estimatedDistanceKm?: number | null;
  estimatedDurationMin?: number | null;
  targetAvgPowerWatts?: number | null;
  elevationGainM?: number | null;
  stops?: Stop[] | null;
  privacy?: string | null;
  targetPaceSecPerKm?: string | null;
  terrain?: string | null;
}

type TabId = 'details' | 'chat' | 'reviews';

function SessionDetailPageInner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const user = useSafeUser();
  const router = useRouter();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('details');
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [memberActionLoading, setMemberActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (session) {
      checkReviewStatus();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);

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

  async function checkReviewStatus() {
    try {
      const res = await fetch(`/api/sessions/${id}/review?check=true`);
      if (res.ok) {
        const data = await res.json() as { hasReviewed: boolean };
        setHasReviewed(data.hasReviewed);
      }
    } catch {
      // Non-fatal
    }
  }

  async function handleJoin() {
    setJoining(true);
    setMessage('');
    try {
      const res = await fetch(`/api/sessions/${id}/join`, { method: 'POST' });
      const data = await res.json() as { success?: boolean; pending?: boolean; error?: string };
      if (res.ok) {
        if (data.pending) {
          setMessage('Prośba o dołączenie została wysłana. Oczekuj na zatwierdzenie.');
        } else {
          setMessage('Dołączono pomyślnie!');
        }
        fetchSession();
      } else {
        setMessage(data.error ?? 'Błąd podczas dołączania');
      }
    } finally {
      setJoining(false);
    }
  }

  async function handleMemberAction(memberId: string, action: 'accept' | 'reject') {
    setMemberActionLoading(memberId + action);
    try {
      await fetch(`/api/sessions/${id}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, action }),
      });
      fetchSession();
    } finally {
      setMemberActionLoading(null);
    }
  }

  async function handleDelete() {
    if (!confirm('Usunąć tę sesję?')) return;
    setDeleting(true);
    try {
      await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
      router.push('/sessions');
    } finally {
      setDeleting(false);
    }
  }

  function handleReviewSubmit() {
    setHasReviewed(true);
    setReviewSubmitted(true);
    setReviewModalOpen(false);
    // Simple feedback
    setTimeout(() => setReviewSubmitted(false), 4000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  const isCreator = user.id === session.creatorId;
  const myParticipant = session.participants.find((p) => p.userId === user.id);
  const myStatus = myParticipant?.status ?? null;
  const isParticipant = myStatus === 'accepted' || myStatus === 'host' || isCreator;
  const hasPendingRequest = myStatus === 'pending';
  const isFull = session.participantCount >= session.maxParticipants;
  const fillPct = Math.min(100, (session.participantCount / session.maxParticipants) * 100);

  // Determine if session is in the past
  const sessionDateTime = new Date(`${session.date}T${session.time}`);
  const isPast = sessionDateTime < new Date();
  const isCompleted = session.status === 'completed' || isPast;

  const canReview = isCompleted && isParticipant && !hasReviewed && !reviewSubmitted;

  const tabs: { id: TabId; label: string }[] = [
    { id: 'details', label: 'Szczegóły' },
    { id: 'chat', label: 'Chat' },
    { id: 'reviews', label: 'Oceny' },
  ];

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '16px 16px 32px' }}>
      {/* Back */}
      <Link
        href="/sessions"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', textDecoration: 'none', fontSize: 14, fontWeight: 500, marginBottom: 20 }}
      >
        <ArrowLeft style={{ width: 16, height: 16 }} />
        Wróć do sesji
      </Link>

      {/* Main card */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 24, padding: '20px', marginBottom: 16, boxShadow: 'var(--shadow-card)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              <Badge sport={session.sportType}>{getSportLabel(session.sportType)}</Badge>
              {session.status === 'cancelled' && (
                <span style={{ fontSize: 11, fontWeight: 600, color: '#EF4444', background: 'rgba(239,68,68,0.1)', borderRadius: 99, padding: '3px 10px' }}>Anulowana</span>
              )}
              {isCompleted && session.status !== 'cancelled' && (
                <span style={{ fontSize: 11, fontWeight: 600, color: '#34D399', background: 'rgba(52,211,153,0.1)', borderRadius: 99, padding: '3px 10px' }}>Zakończona</span>
              )}
            </div>
            <h1 style={{ fontWeight: 800, fontSize: 22, color: 'var(--text)', letterSpacing: -0.5, lineHeight: 1.25 }}>{session.title}</h1>
          </div>

          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {canReview && (
              <Button variant="secondary" size="sm" onClick={() => setReviewModalOpen(true)}>
                <Star style={{ width: 14, height: 14 }} />Oceń
              </Button>
            )}
            {isCreator && (
              <Button variant="danger" size="sm" onClick={handleDelete} loading={deleting}>
                <Trash2 style={{ width: 14, height: 14 }} />Usuń
              </Button>
            )}
          </div>
        </div>

        {reviewSubmitted && (
          <div style={{ marginBottom: 12, padding: '10px 14px', background: 'rgba(52,211,153,0.1)', borderRadius: 12, color: '#34D399', fontSize: 13 }}>
            Dziękujemy za ocenę!
          </div>
        )}

        {session.description && (
          <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>{session.description}</p>
        )}

        {/* Details grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[
            { icon: Calendar, label: session.date },
            { icon: Clock, label: session.time },
          ].map(({ icon: Icon, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-elevated)', borderRadius: 12, padding: '10px 12px' }}>
              <Icon style={{ width: 15, height: 15, color: '#6366F1', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{label}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-elevated)', borderRadius: 12, padding: '10px 12px', gridColumn: '1 / -1' }}>
            <MapPin style={{ width: 15, height: 15, color: '#6366F1', flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{session.location}</span>
          </div>
        </div>

        {/* Participants bar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users style={{ width: 14, height: 14, color: 'var(--text-muted)' }} />
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {session.participantCount}/{session.maxParticipants} uczestników
              </span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: isFull ? 'var(--text-muted)' : '#6366F1' }}>
              {isFull ? 'Pełna' : `${session.maxParticipants - session.participantCount} miejsc`}
            </span>
          </div>
          <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${fillPct}%`, background: isFull ? 'var(--text-dim)' : '#6366F1', borderRadius: 99, transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* Sport stats (cycling / running) */}
        {(() => {
          const CYCLING_SPORTS = ['cycling', 'gravel', 'mtb', 'duathlon', 'triathlon'];
          const RUNNING_SPORTS = ['running', 'trail_running'];
          const isCycling = CYCLING_SPORTS.includes(session.sportType);
          const isRunning = RUNNING_SPORTS.includes(session.sportType);
          const hasStats =
            session.estimatedDistanceKm || session.estimatedDurationMin ||
            session.targetAvgPowerWatts || session.elevationGainM ||
            session.targetPaceSecPerKm || session.terrain;
          if (!hasStats) return null;

          // Format pace from "MM:SS" string
          const paceLabel = session.targetPaceSecPerKm ?? null;

          // Format terrain
          const terrainMap: Record<string, string> = {
            asphalt: 'Asfalt', trail: 'Trail / Terenowy', track: 'Bieżnia',
          };
          const terrainLabel = session.terrain ? (terrainMap[session.terrain] ?? session.terrain) : null;

          return (
            <div className="mb-6 p-4 rounded-2xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-bold text-[#6366F1] uppercase tracking-wider mb-3">
                {isCycling ? '🚴 Szczegóły trasy' : isRunning ? '🏃 Szczegóły biegu' : '📊 Szczegóły'}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {session.estimatedDistanceKm && (
                  <div>
                    <p className="text-xs text-[#888] uppercase tracking-wider mb-0.5">Dystans</p>
                    <p className="text-base font-bold" style={{ color: 'var(--text)' }}>{session.estimatedDistanceKm} km</p>
                  </div>
                )}
                {session.estimatedDurationMin && (
                  <div>
                    <p className="text-xs text-[#888] uppercase tracking-wider mb-0.5">Czas</p>
                    <p className="text-base font-bold" style={{ color: 'var(--text)' }}>
                      {Math.floor(session.estimatedDurationMin / 60) > 0 ? `${Math.floor(session.estimatedDurationMin / 60)}h ` : ''}
                      {session.estimatedDurationMin % 60 > 0 ? `${session.estimatedDurationMin % 60}min` : ''}
                    </p>
                  </div>
                )}
                {isCycling && session.targetAvgPowerWatts && (
                  <div>
                    <p className="text-xs text-[#888] uppercase tracking-wider mb-0.5">Śr. moc</p>
                    <p className="text-base font-bold" style={{ color: 'var(--text)' }}>{session.targetAvgPowerWatts} W</p>
                  </div>
                )}
                {isRunning && paceLabel && (
                  <div>
                    <p className="text-xs text-[#888] uppercase tracking-wider mb-0.5">Tempo</p>
                    <p className="text-base font-bold" style={{ color: 'var(--text)' }}>{paceLabel} /km</p>
                  </div>
                )}
                {session.elevationGainM && (
                  <div>
                    <p className="text-xs text-[#888] uppercase tracking-wider mb-0.5">Przewyższenie</p>
                    <p className="text-base font-bold" style={{ color: 'var(--text)' }}>{session.elevationGainM} m</p>
                  </div>
                )}
                {isRunning && terrainLabel && (
                  <div>
                    <p className="text-xs text-[#888] uppercase tracking-wider mb-0.5">Nawierzchnia</p>
                    <p className="text-base font-bold" style={{ color: 'var(--text)' }}>{terrainLabel}</p>
                  </div>
                )}
              </div>
              {isCycling && session.stops && session.stops.length > 0 && (
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                  <p className="text-xs text-[#888] uppercase tracking-wider mb-2">Postoje</p>
                  <div className="flex flex-col gap-1.5">
                    {session.stops.map((stop, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="w-5 h-5 rounded-full bg-[#6366F1] text-white text-xs flex items-center justify-center font-bold shrink-0">{i + 1}</span>
                        <span style={{ color: 'var(--text)' }} className="font-medium">{stop.name}</span>
                        {stop.location && <span style={{ color: 'var(--text-muted)' }} className="text-xs">· {stop.location}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Privacy badge */}
        {session.privacy === 'friends' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#A78BFA', marginBottom: 12 }}>
            🔒 <span>Sesja dostępna tylko dla znajomych</span>
          </div>
        )}

        {/* GPX download */}
        {session.gpxUrl && (
          <a
            href={session.gpxUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6366F1', marginBottom: 16 }}
          >
            <Download style={{ width: 14, height: 14 }} />Pobierz trasę GPX
          </a>
        )}

        {/* Join button */}
        {!isCreator && session.status !== 'cancelled' && (
          <div>
            {message && (
              <p style={{ fontSize: 13, marginBottom: 10, color: message.includes('Prośba') || message.includes('Dołączono') ? '#34D399' : '#EF4444' }}>
                {message}
              </p>
            )}
            {isParticipant ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#34D399', fontSize: 14, fontWeight: 600, padding: '12px 16px', background: 'rgba(52,211,153,0.1)', borderRadius: 12 }}>
                ✓ Uczestniczysz w tej sesji
              </div>
            ) : hasPendingRequest ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 12, color: 'var(--text-muted)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FBBF24', display: 'inline-block' }} />
                Oczekuje na akceptację
              </div>
            ) : (
              <Button onClick={handleJoin} loading={joining} disabled={isFull} className="w-full">
                {isFull ? 'Sesja pełna' : 'Dołącz do sesji'}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 13,
              background: activeTab === tab.id ? '#6366F1' : 'var(--bg-card)',
              color: activeTab === tab.id ? 'white' : 'var(--text-muted)',
              boxShadow: activeTab === tab.id ? '0 4px 12px rgba(99,102,241,0.3)' : 'var(--shadow-card)',
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Szczegóły */}
      {activeTab === 'details' && (
        <>
          {/* Creator */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: '16px', marginBottom: 12, boxShadow: 'var(--shadow-card)' }}>
            <h2 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Organizator</h2>
            <div className="flex items-center gap-3">
              <Avatar src={session.creatorAvatar} fallback={session.creatorName ?? '?'} size="md" />
              <Link
                href={`/profile/${session.creatorId}`}
                className="font-semibold text-white hover:text-[#6366F1] transition-colors text-sm"
              >
                {session.creatorName ?? 'Nieznany'}
              </Link>
            </div>
          </div>

          {/* Participants list */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: '16px', boxShadow: 'var(--shadow-card)' }}>
            {isCreator ? (
              <>
                {session.participants.filter((p) => p.status === 'pending').length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#FBBF24', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                      Oczekujące ({session.participants.filter((p) => p.status === 'pending').length})
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {session.participants.filter((p) => p.status === 'pending').map((p) => (
                        <div key={p.userId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'rgba(251,191,36,0.06)', borderRadius: 12 }}>
                          <Avatar src={p.avatarUrl} fallback={p.username ?? '?'} size="sm" />
                          <Link href={`/profile/${p.userId}`} style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--text)', textDecoration: 'none' }}>
                            {p.username ?? 'Użytkownik'}
                          </Link>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => handleMemberAction(p.userId, 'accept')} disabled={memberActionLoading === p.userId + 'accept'}
                              style={{ padding: '6px 14px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: '#6366F1', color: 'white', opacity: memberActionLoading === p.userId + 'accept' ? 0.5 : 1 }}>
                              {memberActionLoading === p.userId + 'accept' ? '...' : 'Akceptuj'}
                            </button>
                            <button onClick={() => handleMemberAction(p.userId, 'reject')} disabled={memberActionLoading === p.userId + 'reject'}
                              style={{ padding: '6px 14px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: 'rgba(239,68,68,0.1)', color: '#EF4444', opacity: memberActionLoading === p.userId + 'reject' ? 0.5 : 1 }}>
                              {memberActionLoading === p.userId + 'reject' ? '...' : 'Odrzuć'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                  Zatwierdzeni ({session.participantCount})
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {session.participants.filter((p) => p.status === 'accepted' || p.status === 'host').map((p) => (
                    <Link key={p.userId} href={`/profile/${p.userId}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 12, textDecoration: 'none', transition: 'background 0.15s' }}>
                      <Avatar src={p.avatarUrl} fallback={p.username ?? '?'} size="sm" />
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{p.username ?? 'Użytkownik'}</span>
                      {p.status === 'host' && <span style={{ fontSize: 10, fontWeight: 700, color: '#6366F1', background: 'rgba(99,102,241,0.12)', padding: '3px 8px', borderRadius: 99 }}>HOST</span>}
                    </Link>
                  ))}
                  {session.participants.filter((p) => p.status === 'accepted' || p.status === 'host').length === 0 && (
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Brak zatwierdzonych uczestników.</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                  Uczestnicy ({session.participantCount})
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {session.participants.filter((p) => p.status === 'accepted' || p.status === 'host').map((p) => (
                    <Link key={p.userId} href={`/profile/${p.userId}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 12, textDecoration: 'none' }}>
                      <Avatar src={p.avatarUrl} fallback={p.username ?? '?'} size="sm" />
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{p.username ?? 'Użytkownik'}</span>
                      {p.status === 'host' && <span style={{ fontSize: 10, fontWeight: 700, color: '#6366F1', background: 'rgba(99,102,241,0.12)', padding: '3px 8px', borderRadius: 99 }}>HOST</span>}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Tab: Chat */}
      {activeTab === 'chat' && (
        <>
          {isParticipant ? (
            <GroupChat sessionId={session.id} currentUserId={user.id} currentUsername={user.username} />
          ) : (
            <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, boxShadow: 'var(--shadow-card)' }}>
              Dołącz do sesji, aby uzyskać dostęp do czatu.
            </div>
          )}
        </>
      )}

      {/* Tab: Oceny */}
      {activeTab === 'reviews' && (
        <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: '16px', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Oceny sesji</p>
            {canReview && (
              <Button size="sm" onClick={() => setReviewModalOpen(true)}>
                <Star style={{ width: 12, height: 12 }} />
                Oceń tę sesję
              </Button>
            )}
          </div>
          <ReviewsPanel sessionId={session.id} />
        </div>
      )}

      {/* Review Modal */}
      <ReviewModal
        sessionId={session.id}
        sessionTitle={session.title}
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        onSubmit={handleReviewSubmit}
      />
    </div>
  );
}

interface Review {
  id: number;
  sessionId: number;
  reviewerId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

function ReviewsPanel({ sessionId }: { sessionId: number }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}/review`)
      .then((r) => r.json())
      .then((data: { reviews?: Review[] }) => setReviews(data.reviews ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <p className="text-[#888888] text-sm text-center py-8">
        Brak ocen. Bądź pierwszy!
      </p>
    );
  }

  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 p-3 bg-[var(--bg-elevated)] rounded-3xl">
        <span className="text-3xl font-bold text-white">{avg.toFixed(1)}</span>
        <div>
          <div className="flex gap-0.5">
            {[1,2,3,4,5].map((s) => (
              <Star
                key={s}
                className="w-4 h-4"
                fill={s <= Math.round(avg) ? '#6366F1' : 'transparent'}
                stroke={s <= Math.round(avg) ? '#6366F1' : '#555555'}
              />
            ))}
          </div>
          <span className="text-xs text-[#888888]">{reviews.length} {reviews.length === 1 ? 'ocena' : 'ocen'}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {reviews.map((review) => (
          <div key={review.id} className="border border-[var(--border)] rounded-3xl p-3">
            <div className="flex items-center gap-1 mb-1.5">
              {[1,2,3,4,5].map((s) => (
                <Star
                  key={s}
                  className="w-3.5 h-3.5"
                  fill={s <= review.rating ? '#6366F1' : 'transparent'}
                  stroke={s <= review.rating ? '#6366F1' : '#555555'}
                />
              ))}
            </div>
            {review.comment && (
              <p className="text-sm text-white">{review.comment}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default nextDynamic(() => Promise.resolve({ default: SessionDetailPageInner }), { ssr: false });
