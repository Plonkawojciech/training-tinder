'use client';

import { useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { SessionSwipeCard, type SessionCardData } from './session-swipe-card';
import { useLang } from '@/lib/lang';

interface SessionSwipeStackProps {
  sessions: SessionCardData[];
  onRefresh?: () => void;
}

export function SessionSwipeStack({ sessions, onRefresh }: SessionSwipeStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { t } = useLang();

  const remaining = sessions.slice(currentIndex);
  const topThree = remaining.slice(0, 3);

  const handleJoin = useCallback(async (session: SessionCardData) => {
    try {
      await fetch(`/api/sessions/${session.id}/join`, { method: 'POST' });
    } catch { /* ignore */ }
    setCurrentIndex((prev) => prev + 1);
  }, []);

  const handlePass = useCallback(() => {
    setCurrentIndex((prev) => prev + 1);
  }, []);

  if (remaining.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-6 min-h-[500px]">
        <div className="text-6xl">📅</div>
        <h3 className="font-display text-2xl text-zinc-500 tracking-wider">
          {t('discover_no_sessions_title')}
        </h3>
        <p className="text-zinc-600 text-sm text-center max-w-xs">
          {t('discover_no_sessions')}
        </p>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-6 py-3 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-3xl hover:bg-zinc-700 transition-colors font-semibold text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            {t('gen_refresh')}
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="text-center mb-4">
        <span className="text-zinc-500 text-sm">
          {currentIndex + 1} / {sessions.length}
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

            return (
              <SessionSwipeCard
                key={item.id}
                session={item}
                onJoin={() => handleJoin(item)}
                onPass={handlePass}
                isTop={isTop}
                style={{
                  transform: `scale(${1 - scaleOffset}) translateY(${yOffset}px)`,
                  zIndex: topThree.length - stackIndex,
                  transition: isTop ? undefined : 'transform 0.3s ease',
                }}
              />
            );
          })}
      </div>

      <p className="text-center text-zinc-600 text-xs mt-6">
        {t('discover_session_swipe_hint')}
      </p>
    </>
  );
}
