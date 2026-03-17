'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Compass, MapPin, Grid, Map, Layers } from 'lucide-react';
import { AthleteCard } from '@/components/athletes/athlete-card';
import { SwipeStack } from '@/components/discover/swipe-stack';
import { FilterPanel, type DiscoverFilters, DEFAULT_FILTERS } from '@/components/discover/filter-panel';
import dynamic from 'next/dynamic';

const AthletesMap = dynamic(
  () => import('@/components/maps/athletes-map').then((m) => m.AthletesMap),
  { ssr: false, loading: () => <div className="h-[500px] skeleton" /> }
);

interface MatchResult {
  user: {
    id: string;
    clerkId: string;
    username: string | null;
    avatarUrl: string | null;
    bio: string | null;
    sportTypes: string[];
    pacePerKm: number | null;
    weeklyKm: number | null;
    city: string | null;
    lat?: number | null;
    lng?: number | null;
    stravaVerified?: boolean;
  };
  score: number;
  distanceKm: number | null;
}

type ViewMode = 'swipe' | 'grid' | 'map';

function buildDiscoverUrl(filters: DiscoverFilters, radiusKm: number): string {
  const params = new URLSearchParams();
  params.set('radius', String(radiusKm));
  if (filters.sport !== 'all') params.set('sport', filters.sport);
  if (filters.level) params.set('level', filters.level);
  if (filters.minPace !== null) params.set('minPace', String(filters.minPace));
  if (filters.maxPace !== null) params.set('maxPace', String(filters.maxPace));
  if (filters.minWeeklyKm !== null) params.set('minWeeklyKm', String(filters.minWeeklyKm));
  if (filters.maxWeeklyKm !== null) params.set('maxWeeklyKm', String(filters.maxWeeklyKm));
  if (filters.verified) params.set('verified', 'true');
  return `/api/discover?${params.toString()}`;
}

function DiscoverContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') ?? '';

  const [athletes, setAthletes] = useState<MatchResult[]>([]);
  const [swipedIds, setSwipedIds] = useState<Set<string>>(new Set());
  const [filtered, setFiltered] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('swipe');
  const [radiusKm, setRadiusKm] = useState(100);
  const [filters, setFilters] = useState<DiscoverFilters>(DEFAULT_FILTERS);
  const [pendingFilters, setPendingFilters] = useState<DiscoverFilters>(DEFAULT_FILTERS);

  const fetchAthletes = useCallback(async (activeFilters: DiscoverFilters) => {
    setLoading(true);
    try {
      const [discoverRes, swipeRes] = await Promise.all([
        fetch(buildDiscoverUrl(activeFilters, radiusKm)),
        fetch('/api/swipes'),
      ]);

      if (discoverRes.ok) {
        const data: MatchResult[] = await discoverRes.json();
        setAthletes(data);
      }

      if (swipeRes.ok) {
        const swipeData = await swipeRes.json() as { swipedIds: string[] };
        setSwipedIds(new Set(swipeData.swipedIds));
      }
    } finally {
      setLoading(false);
    }
  }, [radiusKm]);

  useEffect(() => {
    fetchAthletes(filters);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radiusKm]); // Re-fetch on radius change

  useEffect(() => {
    let result = athletes;

    // Filter by search query (client-side)
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (a) =>
          a.user.username?.toLowerCase().includes(q) ||
          a.user.city?.toLowerCase().includes(q) ||
          a.user.bio?.toLowerCase().includes(q)
      );
    }

    // For grid/map: filter out already swiped athletes
    if (viewMode !== 'swipe') {
      result = result.filter((a) => !swipedIds.has(a.user.clerkId));
    }

    setFiltered(result);
  }, [athletes, query, swipedIds, viewMode]);

  function handleApplyFilters() {
    setFilters(pendingFilters);
    fetchAthletes(pendingFilters);
  }

  function handleResetFilters() {
    const reset = DEFAULT_FILTERS;
    setPendingFilters(reset);
    setFilters(reset);
    fetchAthletes(reset);
  }

  // For swipe mode: filter out swiped
  const swipeAthletes = athletes.filter((a) => !swipedIds.has(a.user.clerkId));

  const tabs: { key: ViewMode; label: string; icon: React.ReactNode }[] = [
    { key: 'swipe', label: 'Swipe', icon: <Layers className="w-3.5 h-3.5" /> },
    { key: 'grid', label: 'Lista', icon: <Grid className="w-3.5 h-3.5" /> },
    { key: 'map', label: 'Mapa', icon: <Map className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className={viewMode === 'swipe' ? 'flex flex-col h-full' : 'p-4 md:p-6 max-w-6xl mx-auto'}>
      {/* Desktop header — hidden on mobile swipe */}
      <div className={`items-center gap-3 mb-6 ${viewMode === 'swipe' ? 'hidden md:flex md:px-6 md:pt-6' : 'flex'}`}>
        <Compass className="w-6 h-6 text-[#7C3AED]" />
        <div>
          <h1 className="font-display text-3xl text-white tracking-wider">DISCOVER</h1>
          <p className="text-[#888888] text-sm">
            {query ? `Results for "${query}" — ` : ''}
            {viewMode === 'swipe' ? swipeAthletes.length : filtered.length} sportowców w pobliżu
          </p>
        </div>
      </div>

      {/* Mobile swipe header */}
      {viewMode === 'swipe' && (
        <div className="flex md:hidden items-center justify-between px-4 pt-3 pb-1">
          <span className="font-bold text-base" style={{ color: 'var(--text)' }}>Odkryj Sportowców</span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{swipeAthletes.length} w pobliżu</span>
        </div>
      )}

      {/* View tabs — desktop style */}
      <div className={`items-center border border-[var(--border)] w-fit ${viewMode === 'swipe' ? 'hidden md:flex md:mx-6 md:mb-6' : 'flex mb-6'}`}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setViewMode(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all ${
              viewMode === tab.key
                ? 'bg-[#7C3AED] text-white'
                : 'text-[#888888] hover:text-white'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Mobile view switcher + sport shortcut pills */}
      {viewMode === 'swipe' && (
        <div className="flex md:hidden flex-col gap-2 px-4 pb-2">
          {/* View switcher */}
          <div className="flex items-center justify-center gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setViewMode(tab.key)}
                style={{
                  padding: '5px 14px', borderRadius: 99, fontSize: 12, fontWeight: 700,
                  background: viewMode === tab.key ? '#7C3AED' : 'rgba(255,255,255,0.08)',
                  color: viewMode === tab.key ? 'white' : 'var(--text-muted)', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>
          {/* Quick sport filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { value: 'all', label: 'Wszyscy', emoji: '⚡' },
              { value: 'cycling', label: 'Kolarstwo', emoji: '🚴' },
              { value: 'running', label: 'Bieganie', emoji: '🏃' },
              { value: 'gym', label: 'Siłownia', emoji: '🏋️' },
              { value: 'trail_running', label: 'Trail', emoji: '🌿' },
            ].map((s) => {
              const active = filters.sport === s.value;
              return (
                <button
                  key={s.value}
                  onClick={() => {
                    const next = { ...pendingFilters, sport: s.value };
                    setPendingFilters(next);
                    setFilters(next);
                    fetchAthletes(next);
                  }}
                  style={{
                    flexShrink: 0,
                    padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700,
                    background: active ? '#7C3AED' : 'var(--bg-elevated)',
                    color: active ? 'white' : 'var(--text-muted)',
                    border: `1px solid ${active ? '#7C3AED' : 'var(--border)'}`,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span>{s.emoji}</span>{s.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Controls for list/map */}
      {viewMode !== 'swipe' && (
        <div className="mb-6">
          <FilterPanel
            filters={pendingFilters}
            onChange={setPendingFilters}
            onApply={handleApplyFilters}
            onReset={handleResetFilters}
          />
        </div>
      )}

      {/* Radius + filters — desktop only for swipe mode */}
      {viewMode === 'swipe' && (
        <div className="hidden md:flex flex-col gap-4 mb-6 px-6">
          <div className="flex items-center gap-4">
            <span className="text-zinc-500 text-xs uppercase tracking-wider whitespace-nowrap">
              Radius: {radiusKm} km
            </span>
            <input
              type="range" min={10} max={500} step={10} value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="flex-1 h-1 bg-zinc-700 rounded-xl appearance-none accent-violet-600"
            />
            <span className="text-zinc-600 text-xs">500 km</span>
          </div>
          <FilterPanel
            filters={pendingFilters}
            onChange={setPendingFilters}
            onApply={handleApplyFilters}
            onReset={handleResetFilters}
          />
        </div>
      )}

      {/* Swipe tab */}
      {viewMode === 'swipe' && (
        loading ? (
          <div className="flex flex-col items-center justify-center gap-4 flex-1 min-h-[500px]">
            <div className="w-12 h-12 skeleton rounded-full" />
            <div className="text-zinc-600 text-sm">Wczytywanie sportowców...</div>
          </div>
        ) : (
          <div className="flex-1 md:px-6 md:pb-6">
            <SwipeStack
              athletes={swipeAthletes}
              onRefresh={() => fetchAthletes(filters)}
            />
          </div>
        )
      )}

      {/* Map View */}
      {viewMode === 'map' && !loading && (
        <div className="border border-[var(--border)]" style={{ height: 500 }}>
          <AthletesMap
            athletes={filtered
              .filter((a) => a.user.lat !== undefined && a.user.lng !== undefined)
              .map((a) => ({
                id: a.user.clerkId,
                lat: a.user.lat!,
                lng: a.user.lng!,
                sport: a.user.sportTypes[0] ?? 'gym',
                username: a.user.username,
                avatarUrl: a.user.avatarUrl,
              }))}
          />
        </div>
      )}

      {/* Grid / List view */}
      {viewMode === 'grid' && (
        loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-52 skeleton" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <MapPin className="w-12 h-12 text-[#2A2A2A]" />
            <h3 className="font-display text-xl text-[#888888]">BRAK SPORTOWCÓW</h3>
            <p className="text-[#888888] text-sm text-center">
              {query ? `Brak wyników dla "${query}". Spróbuj innego wyszukiwania.` : 'Bądź pierwszym sportowcem w swoim rejonie!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((a) => (
              <AthleteCard
                key={a.user.clerkId}
                id={a.user.clerkId}
                username={a.user.username}
                avatarUrl={a.user.avatarUrl}
                bio={a.user.bio}
                sportTypes={a.user.sportTypes}
                pacePerKm={a.user.pacePerKm}
                weeklyKm={a.user.weeklyKm}
                city={a.user.city}
                score={a.score}
                distanceKm={a.distanceKm}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Compass className="w-6 h-6 text-[#7C3AED]" />
          <h1 className="font-display text-3xl text-white tracking-wider">DISCOVER</h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-52 skeleton" />
          ))}
        </div>
      </div>
    }>
      <DiscoverContent />
    </Suspense>
  );
}
