'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Dumbbell, Navigation, X, SlidersHorizontal } from 'lucide-react';
import { SessionCard } from '@/components/sessions/session-card';
import { Button } from '@/components/ui/button';

interface SessionData {
  id: number;
  title: string;
  sportType: string;
  date: string;
  time: string;
  location: string;
  lat: number | null;
  lon: number | null;
  maxParticipants: number;
  participantCount: number;
  description: string | null;
  status: string;
  creatorName: string | null;
}

const SPORT_PILLS = [
  { value: 'all', label: 'Wszystkie', emoji: '⚡' },
  { value: 'cycling', label: 'Kolarstwo', emoji: '🚴' },
  { value: 'running', label: 'Bieganie', emoji: '🏃' },
  { value: 'gym', label: 'Siłownia', emoji: '🏋️' },
  { value: 'trail_running', label: 'Trail', emoji: '🌿' },
  { value: 'swimming', label: 'Pływanie', emoji: '🏊' },
];

const NEARBY_RADIUS_KM = 50;

function getBboxFromCenter(lat: number, lon: number, radiusKm: number) {
  const KM_PER_DEG_LAT = 111.32;
  const latDelta = radiusKm / KM_PER_DEG_LAT;
  const lonDelta = radiusKm / (KM_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180));
  return {
    north: (lat + latDelta).toFixed(6),
    south: (lat - latDelta).toFixed(6),
    east: (lon + lonDelta).toFixed(6),
    west: (lon - lonDelta).toFixed(6),
  };
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sport, setSport] = useState('all');
  const [tab, setTab] = useState<'all' | 'mine'>('all');
  const [activeBbox, setActiveBbox] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (sport !== 'all') params.set('sport', sport);
      if (tab === 'mine') params.set('mine', 'true');
      if (activeBbox) params.set('bbox', activeBbox);
      const res = await fetch(`/api/sessions?${params.toString()}`);
      if (res.ok) setSessions(await res.json());
    } finally {
      setLoading(false);
    }
  }, [sport, tab, activeBbox]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  function handleNearbyMe() {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const b = getBboxFromCenter(pos.coords.latitude, pos.coords.longitude, NEARBY_RADIUS_KM);
        setActiveBbox(`${b.south},${b.west},${b.north},${b.east}`);
        setGeoLoading(false);
      },
      () => setGeoLoading(false)
    );
  }

  return (
    <div style={{ minHeight: '100%', background: 'var(--bg)' }}>

      {/* ── MOBILE ── */}
      <div className="md:hidden">
        {/* Sticky top area */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: 'var(--bg)', paddingBottom: 12,
          borderBottom: '1px solid var(--border)',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px' }}>
            <div>
              <h1 style={{ fontWeight: 800, fontSize: 22, color: 'var(--text)', letterSpacing: -0.5 }}>Sesje</h1>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {sessions.length} sesji treningowych
              </p>
            </div>
            <Link href="/sessions/new" style={{ textDecoration: 'none' }}>
              <div style={{
                width: 44, height: 44, borderRadius: 14,
                background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(124,58,237,0.35)',
              }}>
                <Plus style={{ width: 22, height: 22, color: 'white' }} />
              </div>
            </Link>
          </div>

          {/* Tab switcher */}
          <div style={{ display: 'flex', padding: '0 16px', gap: 8, marginBottom: 10 }}>
            {(['all', 'mine'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: 13,
                  background: tab === t ? '#7C3AED' : 'var(--bg-elevated)',
                  color: tab === t ? 'white' : 'var(--text-muted)',
                  transition: 'all 0.15s',
                }}
              >
                {t === 'all' ? 'Wszystkie' : 'Moje'}
              </button>
            ))}
          </div>

          {/* Sport pills */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 16px', paddingBottom: 2 }}>
            {SPORT_PILLS.map((s) => (
              <button
                key={s.value}
                onClick={() => setSport(s.value)}
                style={{
                  flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
                  padding: '7px 14px', borderRadius: 99, border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap',
                  background: sport === s.value ? '#7C3AED' : 'var(--bg-elevated)',
                  color: sport === s.value ? 'white' : 'var(--text-muted)',
                  transition: 'all 0.15s',
                }}
              >
                <span>{s.emoji}</span>{s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Nearby me + active bbox */}
        <div style={{ padding: '12px 16px', display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={handleNearbyMe}
            disabled={geoLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 99, border: '1.5px solid var(--border)', cursor: 'pointer',
              background: activeBbox ? 'rgba(124,58,237,0.1)' : 'var(--bg-card)',
              color: activeBbox ? '#7C3AED' : 'var(--text-muted)',
              fontWeight: 600, fontSize: 12, transition: 'all 0.15s',
            }}
          >
            <Navigation style={{ width: 13, height: 13 }} />
            {geoLoading ? 'Lokalizowanie...' : `W okolicy (${NEARBY_RADIUS_KM}km)`}
          </button>
          {activeBbox && (
            <button
              onClick={() => setActiveBbox(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '8px 12px', borderRadius: 99, border: 'none', cursor: 'pointer',
                background: 'rgba(239,68,68,0.1)', color: '#EF4444',
                fontWeight: 600, fontSize: 12,
              }}
            >
              <X style={{ width: 12, height: 12 }} />
              Wyczyść
            </button>
          )}
        </div>

        {/* Sessions list */}
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 160, borderRadius: 20 }} />
            ))
          ) : sessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <Dumbbell style={{ width: 48, height: 48, color: 'var(--text-dim)' }} />
              <p style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)' }}>Brak sesji</p>
              <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                {tab === 'mine' ? 'Nie masz jeszcze żadnych sesji.' : 'Bądź pierwszy! Utwórz sesję treningową.'}
              </p>
              <Link href="/sessions/new" style={{ textDecoration: 'none' }}>
                <Button><Plus className="w-4 h-4" />Utwórz Sesję</Button>
              </Link>
            </div>
          ) : (
            sessions.map((session) => <SessionCard key={session.id} {...session} />)
          )}
        </div>
      </div>

      {/* ── DESKTOP ── */}
      <div className="hidden md:block p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-bold text-2xl tracking-tight" style={{ color: 'var(--text)' }}>Sesje</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{sessions.length} sesji treningowych</p>
          </div>
          <Link href="/sessions/new">
            <Button><Plus className="w-4 h-4" />Nowa Sesja</Button>
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {(['all', 'mine'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-5 py-2.5 rounded-[12px] text-sm font-semibold transition-all"
              style={{
                background: tab === t ? '#7C3AED' : 'var(--bg-card)',
                color: tab === t ? 'white' : 'var(--text-muted)',
                boxShadow: tab === t ? '0 4px 12px rgba(124,58,237,0.3)' : 'var(--shadow-card)',
              }}
            >
              {t === 'all' ? 'Wszystkie sesje' : 'Moje sesje'}
            </button>
          ))}
        </div>

        {/* Sport pills */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {SPORT_PILLS.map((s) => (
            <button
              key={s.value}
              onClick={() => setSport(s.value)}
              className="flex items-center gap-2 px-4 py-2 rounded-[10px] text-sm font-semibold transition-all"
              style={{
                background: sport === s.value ? '#7C3AED' : 'var(--bg-card)',
                color: sport === s.value ? 'white' : 'var(--text-muted)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <span>{s.emoji}</span>{s.label}
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={handleNearbyMe}
            disabled={geoLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-[10px] text-sm font-semibold transition-all"
            style={{
              background: activeBbox ? 'rgba(124,58,237,0.1)' : 'var(--bg-card)',
              color: activeBbox ? '#7C3AED' : 'var(--text-muted)',
              boxShadow: 'var(--shadow-card)',
              border: activeBbox ? '1.5px solid rgba(124,58,237,0.3)' : '1.5px solid transparent',
            }}
          >
            <Navigation className="w-4 h-4" />
            {geoLoading ? 'Lokalizowanie...' : `W okolicy (${NEARBY_RADIUS_KM}km)`}
          </button>
          {activeBbox && (
            <button
              onClick={() => setActiveBbox(null)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-sm font-semibold"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}
            >
              <X className="w-3.5 h-3.5" />Wyczyść filtr
            </button>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 200, borderRadius: 20 }} />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Dumbbell className="w-12 h-12" style={{ color: 'var(--text-dim)' }} />
            <p className="font-bold text-lg" style={{ color: 'var(--text)' }}>Brak sesji</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {tab === 'mine' ? 'Nie masz jeszcze żadnych sesji.' : 'Bądź pierwszy! Utwórz sesję treningową.'}
            </p>
            <Link href="/sessions/new"><Button><Plus className="w-4 h-4" />Utwórz Sesję</Button></Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map((session) => <SessionCard key={session.id} {...session} />)}
          </div>
        )}
      </div>
    </div>
  );
}
