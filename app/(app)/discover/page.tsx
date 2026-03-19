'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Compass, Grid, Map, Layers, Users, Calendar, SlidersHorizontal, SearchX, RotateCcw } from 'lucide-react';
import { AthleteCard } from '@/components/athletes/athlete-card';
import { SwipeStack } from '@/components/discover/swipe-stack';
import { SessionSwipeStack } from '@/components/discover/session-swipe-stack';
import { MixedSwipeStack } from '@/components/discover/mixed-swipe-stack';
import type { SessionCardData } from '@/components/discover/session-swipe-card';
import { FilterPanel, type DiscoverFilters, DEFAULT_FILTERS } from '@/components/discover/filter-panel';
import { useLang } from '@/lib/lang';
import dynamic from 'next/dynamic';

const AthletesMap = dynamic(
  () => import('@/components/maps/athletes-map').then((m) => m.AthletesMap),
  { ssr: false, loading: () => <div className="h-[500px] skeleton" /> }
);

interface MatchResult {
  user: {
    id: string;
    authEmail: string;
    username: string | null;
    avatarUrl: string | null;
    bio: string | null;
    sportTypes: string[];
    pacePerKm: number | null;
    weeklyKm: number | null;
    city: string | null;
    lat?: number | null;
    lon?: number | null;
    stravaVerified?: boolean;
    ftpWatts?: number | null;
  };
  score: number;
  distanceKm: number | null;
}

type ViewMode = 'swipe' | 'grid' | 'map';
type DiscoverMode = 'people' | 'sessions' | 'mixed';

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
  const { t } = useLang();
  const query = searchParams.get('q') ?? '';

  const [athletes, setAthletes] = useState<MatchResult[]>([]);
  const [swipedIds, setSwipedIds] = useState<Set<string>>(new Set());
  const [filtered, setFiltered] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('swipe');
  const [discoverMode, setDiscoverMode] = useState<DiscoverMode>('people');
  const [sessions, setSessions] = useState<SessionCardData[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [radiusKm, setRadiusKm] = useState(() => {
    if (typeof window === 'undefined') return 100;
    const saved = localStorage.getItem('tt-discover-radius');
    return saved ? parseInt(saved) || 100 : 100;
  });
  const [filters, setFilters] = useState<DiscoverFilters>(() => {
    if (typeof window === 'undefined') return DEFAULT_FILTERS;
    try {
      const saved = localStorage.getItem('tt-discover-filters');
      return saved ? { ...DEFAULT_FILTERS, ...JSON.parse(saved) } : DEFAULT_FILTERS;
    } catch { return DEFAULT_FILTERS; }
  });
  const [pendingFilters, setPendingFilters] = useState<DiscoverFilters>(() => {
    if (typeof window === 'undefined') return DEFAULT_FILTERS;
    try {
      const saved = localStorage.getItem('tt-discover-filters');
      return saved ? { ...DEFAULT_FILTERS, ...JSON.parse(saved) } : DEFAULT_FILTERS;
    } catch { return DEFAULT_FILTERS; }
  });
  const [gridPage, setGridPage] = useState(0);
  const [hasMoreGrid, setHasMoreGrid] = useState(true);
  const gridSentinelRef = useRef<HTMLDivElement>(null);

  // Swipe infinite scroll state
  const [swipePage, setSwipePage] = useState(0);
  const [hasMoreSwipe, setHasMoreSwipe] = useState(true);
  const [swipeLoadingMore, setSwipeLoadingMore] = useState(false);
  const swipeFetchingRef = useRef(false);

  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await fetch('/api/sessions');
      if (res.ok) {
        const data = await res.json() as SessionCardData[];
        // Shuffle for variety
        const shuffled = [...data].sort(() => Math.random() - 0.5);
        setSessions(shuffled);
      }
    } finally {
      setSessionsLoading(false);
    }
  }, []);

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
    fetchSessions();
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
      result = result.filter((a) => !swipedIds.has(a.user.authEmail));
    }

    setFiltered(result);
  }, [athletes, query, swipedIds, viewMode]);

  // Persist filters and radius to localStorage
  useEffect(() => {
    localStorage.setItem('tt-discover-filters', JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    localStorage.setItem('tt-discover-radius', String(radiusKm));
  }, [radiusKm]);

  function handleApplyFilters() {
    setFilters(pendingFilters);
    setGridPage(0);
    setHasMoreGrid(true);
    setSwipePage(0);
    setHasMoreSwipe(true);
    fetchAthletes(pendingFilters);
  }

  function handleResetFilters() {
    const reset = DEFAULT_FILTERS;
    setPendingFilters(reset);
    setFilters(reset);
    setGridPage(0);
    setHasMoreGrid(true);
    setSwipePage(0);
    setHasMoreSwipe(true);
    fetchAthletes(reset);
  }

  // Infinite scroll for grid view
  useEffect(() => {
    if (viewMode !== 'grid') return;
    const sentinel = gridSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreGrid && !loading) {
          setGridPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [viewMode, hasMoreGrid, loading]);

  // Load more athletes when gridPage increments
  useEffect(() => {
    if (gridPage === 0) return;
    (async () => {
      const url = buildDiscoverUrl(filters, radiusKm) + `&limit=50&offset=${gridPage * 50}`;
      const res = await fetch(url);
      if (res.ok) {
        const data: MatchResult[] = await res.json();
        if (data.length < 50) setHasMoreGrid(false);
        setAthletes((prev) => {
          const existingIds = new Set(prev.map((a) => a.user.authEmail));
          const newItems = data.filter((a) => !existingIds.has(a.user.authEmail));
          return [...prev, ...newItems];
        });
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridPage]);

  // Swipe infinite scroll: auto-fetch more athletes when running low
  const fetchMoreSwipeAthletes = useCallback(async () => {
    if (swipeFetchingRef.current || !hasMoreSwipe) return;
    swipeFetchingRef.current = true;
    setSwipeLoadingMore(true);
    try {
      const nextPage = swipePage + 1;
      const url = buildDiscoverUrl(filters, radiusKm) + `&limit=50&offset=${nextPage * 50}`;
      const res = await fetch(url);
      if (res.ok) {
        const data: MatchResult[] = await res.json();
        if (data.length < 50) setHasMoreSwipe(false);
        if (data.length > 0) {
          setAthletes((prev) => {
            const existingIds = new Set(prev.map((a) => a.user.authEmail));
            const newItems = data.filter((a) => !existingIds.has(a.user.authEmail));
            return [...prev, ...newItems];
          });
          setSwipePage(nextPage);
        } else {
          setHasMoreSwipe(false);
        }
      }
    } finally {
      setSwipeLoadingMore(false);
      swipeFetchingRef.current = false;
    }
  }, [swipePage, hasMoreSwipe, filters, radiusKm]);

  // For swipe mode: filter out swiped
  const swipeAthletes = athletes.filter((a) => !swipedIds.has(a.user.authEmail));

  // Auto-fetch more when running low on swipe cards (< 5 remaining)
  useEffect(() => {
    if (viewMode !== 'swipe' || discoverMode !== 'people') return;
    if (swipeAthletes.length < 5 && hasMoreSwipe && !swipeLoadingMore && !loading) {
      fetchMoreSwipeAthletes();
    }
  }, [viewMode, discoverMode, swipeAthletes.length, hasMoreSwipe, swipeLoadingMore, loading, fetchMoreSwipeAthletes]);

  const tabs: { key: ViewMode; label: string; icon: React.ReactNode }[] = [
    { key: 'swipe', label: t('discover_cards'), icon: <Layers className="w-3.5 h-3.5" /> },
    { key: 'grid', label: t('discover_list'), icon: <Grid className="w-3.5 h-3.5" /> },
    { key: 'map', label: t('discover_map'), icon: <Map className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className={viewMode === 'swipe' ? 'flex flex-col h-full' : 'p-4 md:p-6 max-w-6xl mx-auto'}>
      {/* Desktop header — hidden on mobile swipe */}
      <div className={`items-center gap-3 mb-6 ${viewMode === 'swipe' ? 'hidden md:flex md:px-6 md:pt-6' : 'flex'}`}>
        <Compass className="w-6 h-6 text-[#6366F1]" />
        <div>
          <h1 className="font-display text-3xl text-[var(--text)] tracking-wider">{t('discover_title')}</h1>
          <p className="text-[var(--text-muted)] text-sm">
            {query ? `${t('discover_results_for')} "${query}" — ` : ''}
            {viewMode === 'swipe' ? swipeAthletes.length : filtered.length} {t('discover_subtitle')}
          </p>
        </div>
      </div>

      {/* Mobile swipe header */}
      {viewMode === 'swipe' && (
        <div className="flex md:hidden items-center justify-between px-4 pt-3 pb-1">
          <span className="font-bold text-base" style={{ color: 'var(--text)' }}>{t('discover_mobile_title')}</span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {discoverMode === 'sessions' ? `${sessions.length} ${t('discover_sessions_count')}` : `${swipeAthletes.length} ${t('discover_nearby_count')}`}
          </span>
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
                ? 'bg-[#6366F1] text-white'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
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
          {/* Discover mode toggle: People / Sessions */}
          <div style={{
            display: 'flex', background: 'var(--bg-elevated)', borderRadius: 12, padding: 3, gap: 2,
          }}>
            {([
              { key: 'people', label: t('discover_cyclists'), icon: <Users style={{ width: 13, height: 13 }} /> },
              { key: 'sessions', label: t('discover_rides'), icon: <Calendar style={{ width: 13, height: 13 }} /> },
            ] as { key: DiscoverMode; label: string; icon: React.ReactNode }[]).map((m) => (
              <button
                key={m.key}
                onClick={() => setDiscoverMode(m.key)}
                style={{
                  flex: 1, padding: '10px 4px', borderRadius: 9, fontSize: 11, fontWeight: 700, minHeight: 44,
                  background: discoverMode === m.key ? '#6366F1' : 'transparent',
                  color: discoverMode === m.key ? 'white' : 'var(--text-muted)',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  transition: 'all 0.15s',
                }}
              >
                {m.icon}{m.label}
              </button>
            ))}
          </div>
          {/* View switcher */}
          <div className="flex items-center justify-center gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setViewMode(tab.key)}
                style={{
                  padding: '8px 14px', borderRadius: 99, fontSize: 12, fontWeight: 700, minHeight: 44,
                  background: viewMode === tab.key ? '#6366F1' : 'var(--bg-elevated)',
                  color: viewMode === tab.key ? 'white' : 'var(--text-muted)', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>
          {/* Quick sport filter — cycling-first */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { value: 'cycling', label: t('discover_road'), emoji: '🚴' },
              { value: 'gravel', label: t('discover_gravel'), emoji: '🪨' },
              { value: 'mtb', label: t('discover_mtb'), emoji: '⛰️' },
              { value: 'all', label: t('discover_all'), emoji: '⚡' },
              { value: 'running', label: t('discover_running'), emoji: '🏃' },
            ].map((s) => {
              const active = filters.sport === s.value;
              return (
                <button
                  key={s.value}
                  onClick={() => {
                    const next = { ...pendingFilters, sport: s.value };
                    setPendingFilters(next);
                    setFilters(next);
                    setSwipePage(0);
                    setHasMoreSwipe(true);
                    fetchAthletes(next);
                  }}
                  style={{
                    flexShrink: 0,
                    padding: '8px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700, minHeight: 44,
                    background: active ? '#6366F1' : 'var(--bg-elevated)',
                    color: active ? 'white' : 'var(--text-muted)',
                    border: `1px solid ${active ? '#6366F1' : 'var(--border)'}`,
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
            <span className="text-[var(--text-muted)] text-xs uppercase tracking-wider whitespace-nowrap">
              {t('discover_range')}: {radiusKm} km
            </span>
            <input
              type="range" min={10} max={500} step={10} value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="flex-1 h-1 rounded-xl appearance-none accent-violet-600"
              style={{ background: 'var(--border)' }}
            />
            <span className="text-[var(--text-dim)] text-xs">500 km</span>
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
        (loading || sessionsLoading) ? (
          <div className="flex flex-col items-center justify-center gap-4 flex-1 min-h-[500px]">
            <div className="w-12 h-12 skeleton rounded-full" />
            <div className="text-[var(--text-dim)] text-sm">
              {discoverMode === 'sessions' ? t('discover_loading_sessions') : t('discover_loading_athletes')}
            </div>
          </div>
        ) : discoverMode === 'people' ? (
          athletes.length === 0 ? (
            /* Empty state — no athletes match current filters */
            <div className="flex flex-col items-center justify-center gap-6 flex-1 min-h-[500px] px-6">
              <SearchX className="w-16 h-16 text-[var(--border)]" />
              <h3 className="font-display text-2xl text-[var(--text-muted)] text-center">{t('discover_empty_title')}</h3>
              <p className="text-[var(--text-muted)] text-sm text-center max-w-sm">
                {t('discover_empty_desc')}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleResetFilters}
                  className="flex items-center justify-center gap-2 px-5 py-3 bg-[#6366F1] text-white text-sm font-semibold rounded-full hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all min-h-[44px]"
                >
                  <RotateCcw className="w-4 h-4" />
                  {t('discover_empty_reset')}
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className="flex items-center justify-center gap-2 px-5 py-3 border border-[var(--border)] text-[var(--text-muted)] text-sm font-semibold rounded-full hover:border-[#6366F1] hover:text-[var(--text)] transition-all min-h-[44px]"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  {t('discover_empty_adjust')}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 md:px-6 md:pb-6">
              <SwipeStack
                athletes={swipeAthletes}
                onRefresh={() => fetchAthletes(filters)}
              />
              {swipeLoadingMore && (
                <div className="flex justify-center py-4">
                  <div className="flex items-center gap-2 text-[var(--text-dim)] text-sm">
                    <div className="w-4 h-4 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
                    {t('discover_loading_more')}
                  </div>
                </div>
              )}
            </div>
          )
        ) : discoverMode === 'sessions' ? (
          <div className="flex-1 md:px-6 md:pb-6">
            <SessionSwipeStack
              sessions={sessions}
              onRefresh={fetchSessions}
            />
          </div>
        ) : (
          /* Mixed mode — interleave athletes and sessions randomly */
          <div className="flex-1 md:px-6 md:pb-6">
            <MixedSwipeStack
              athletes={swipeAthletes}
              sessions={sessions}
              onRefreshAthletes={() => fetchAthletes(filters)}
              onRefreshSessions={fetchSessions}
            />
          </div>
        )
      )}

      {/* Map View */}
      {viewMode === 'map' && !loading && (
        filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-6">
            <SearchX className="w-16 h-16 text-[var(--border)]" />
            <h3 className="font-display text-2xl text-[var(--text-muted)]">{t('discover_empty_title')}</h3>
            <p className="text-[var(--text-muted)] text-sm text-center max-w-sm">
              {t('discover_empty_desc')}
            </p>
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-2 px-5 py-3 bg-[#6366F1] text-white text-sm font-semibold rounded-full hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all min-h-[44px]"
            >
              <RotateCcw className="w-4 h-4" />
              {t('discover_empty_reset')}
            </button>
          </div>
        ) : (
          <div className="border border-[var(--border)]" style={{ height: 'min(500px, 60vh)' }}>
            <AthletesMap
              athletes={filtered
                .filter((a) => a.user.lat != null && a.user.lon != null)
                .map((a) => ({
                  id: a.user.authEmail,
                  lat: a.user.lat!,
                  lng: a.user.lon!,
                  sport: a.user.sportTypes?.[0] ?? 'gym',
                  username: a.user.username,
                  avatarUrl: a.user.avatarUrl,
                }))}
            />
          </div>
        )
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
          <div className="flex flex-col items-center justify-center py-20 gap-6">
            <SearchX className="w-16 h-16 text-[var(--border)]" />
            <h3 className="font-display text-2xl text-[var(--text-muted)]">{t('discover_empty_title')}</h3>
            <p className="text-[var(--text-muted)] text-sm text-center max-w-sm">
              {query ? t('discover_no_results_query', { query }) : t('discover_empty_desc')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-2 px-5 py-3 bg-[#6366F1] text-white text-sm font-semibold rounded-full hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all min-h-[44px]"
              >
                <RotateCcw className="w-4 h-4" />
                {t('discover_empty_reset')}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((a) => (
                <AthleteCard
                  key={a.user.authEmail}
                  id={a.user.authEmail}
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
            {hasMoreGrid && (
              <div ref={gridSentinelRef} className="flex justify-center py-6">
                <div className="w-6 h-6 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}

export default function DiscoverPage() {
  const { t } = useLang();
  return (
    <Suspense fallback={
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Compass className="w-6 h-6 text-[#6366F1]" />
          <h1 className="font-display text-3xl text-[var(--text)] tracking-wider">{t('discover_title')}</h1>
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
