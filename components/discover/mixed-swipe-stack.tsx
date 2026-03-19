'use client';

import { useState, useCallback, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { SwipeCard, type SwipeCardAthlete } from './swipe-card';
import { SessionSwipeCard, type SessionCardData } from './session-swipe-card';
import { useLang } from '@/lib/lang';

interface MatchResult {
  user: SwipeCardAthlete & { id: string };
  score: number;
  distanceKm: number | null;
}

type MixedItem =
  | { type: 'athlete'; data: MatchResult }
  | { type: 'session'; data: SessionCardData };

interface MixedSwipeStackProps {
  athletes: MatchResult[];
  sessions: SessionCardData[];
  onRefreshAthletes?: () => void;
  onRefreshSessions?: () => void;
}

export function MixedSwipeStack({ athletes, sessions, onRefreshAthletes, onRefreshSessions }: MixedSwipeStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { t } = useLang();

  // Interleave athletes and sessions, shuffle for variety
  const items = useMemo<MixedItem[]>(() => {
    const athleteItems: MixedItem[] = athletes.map((a) => ({ type: 'athlete', data: a }));
    const sessionItems: MixedItem[] = sessions.map((s) => ({ type: 'session', data: s }));
    const result: MixedItem[] = [];
    const maxLen = Math.max(athleteItems.length, sessionItems.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < athleteItems.length) result.push(athleteItems[i]);
      if (i < sessionItems.length) result.push(sessionItems[i]);
    }
    return result;
  }, [athletes, sessions]);

  const remaining = items.slice(currentIndex);
  const topThree = remaining.slice(0, 3);

  const advance = useCallback(() => setCurrentIndex((p) => p + 1), []);

  const handleAthleteSwipe = useCallback(async (item: MatchResult, direction: 'like' | 'pass') => {
    try {
      const res = await fetch('/api/swipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: item.user.authEmail, direction }),
      });
      if (res.ok) {
        await res.json();
      }
    } catch { /* ignore */ }
    advance();
  }, [advance]);

  const handleSessionJoin = useCallback(async (session: SessionCardData) => {
    try {
      await fetch(`/api/sessions/${session.id}/join`, { method: 'POST' });
    } catch { /* ignore */ }
    advance();
  }, [advance]);

  if (remaining.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-6 min-h-[500px]">
        <div className="text-6xl">🎲</div>
        <h3 className="font-display text-2xl text-zinc-500 tracking-wider">
          {t('discover_seen_all_mixed_title')}
        </h3>
        <p className="text-zinc-600 text-sm text-center max-w-xs">
          {t('discover_seen_all_mixed')}
        </p>
        <div className="flex gap-3">
          {onRefreshAthletes && (
            <button
              onClick={() => { onRefreshAthletes(); onRefreshSessions?.(); setCurrentIndex(0); }}
              className="flex items-center gap-2 px-6 py-3 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-3xl hover:bg-zinc-700 transition-colors font-semibold text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              {t('gen_refresh')}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="text-center mb-4">
        <span className="text-zinc-500 text-sm">
          {currentIndex + 1} / {items.length}
        </span>
      </div>

      <div className="relative mx-auto md:max-w-[400px]" style={{ width: '100%', height: 'clamp(400px, 65vh, 600px)' }}>
        {topThree
          .slice()
          .reverse()
          .map((item, reversedIndex) => {
            const stackIndex = topThree.length - 1 - reversedIndex;
            const isTop = stackIndex === 0;
            const scaleOffset = stackIndex * 0.04;
            const yOffset = stackIndex * 12;
            const sharedStyle: React.CSSProperties = {
              transform: `scale(${1 - scaleOffset}) translateY(${yOffset}px)`,
              zIndex: topThree.length - stackIndex,
              transition: isTop ? undefined : 'transform 0.3s ease',
            };

            if (item.type === 'athlete') {
              return (
                <SwipeCard
                  key={`a-${item.data.user.authEmail}`}
                  athlete={item.data.user}
                  score={item.data.score}
                  distanceKm={item.data.distanceKm}
                  onLike={() => handleAthleteSwipe(item.data, 'like')}
                  onPass={() => handleAthleteSwipe(item.data, 'pass')}
                  onSuperLike={() => handleAthleteSwipe(item.data, 'like')}
                  isTop={isTop}
                  style={sharedStyle}
                />
              );
            } else {
              return (
                <SessionSwipeCard
                  key={`s-${item.data.id}`}
                  session={item.data}
                  onJoin={() => handleSessionJoin(item.data)}
                  onPass={advance}
                  isTop={isTop}
                  style={sharedStyle}
                />
              );
            }
          })}
      </div>

      <p className="text-center text-zinc-600 text-xs mt-6">
        {t('discover_swipe_hint_mixed')}
      </p>
    </>
  );
}
