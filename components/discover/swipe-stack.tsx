'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { SwipeCard } from './swipe-card';
import { useLang } from '@/lib/lang';

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
    profileSongUrl?: string | null;
    ftpWatts?: number | null;
  };
  score: number;
  distanceKm: number | null;
}

interface SwipeStackProps {
  athletes: MatchResult[];
  onRefresh?: () => void;
}

interface MatchPopupProps {
  username: string | null;
  avatarUrl: string | null;
  onClose: () => void;
}

function MatchPopup({ username, avatarUrl, onClose, authEmail }: MatchPopupProps & { authEmail: string }) {
  const { t } = useLang();
  const router = useRouter();

  const [confettiRandom] = useState(() =>
    Array.from({ length: 30 }).map(() => ({
      size: 4 + Math.random() * 8,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: 1.5 + Math.random() * 2,
      delay: Math.random() * 0.5,
    })));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.85)' }}
    >
      {/* Confetti-style dots */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {confettiRandom.map((r, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${r.size}px`,
              height: `${r.size}px`,
              left: `${r.left}%`,
              top: `${r.top}%`,
              background: ['#6366F1', '#00CC44', '#FFD700', '#00D4FF', '#FF69B4'][i % 5],
              animation: `confettiFall ${r.duration}s ease-in forwards`,
              animationDelay: `${r.delay}s`,
            }}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes confettiFall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
        }
        @keyframes popIn {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        .pop-in {
          animation: popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>

      <div
        className="pop-in relative max-w-sm w-full mx-4 text-center overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #1a1a1a 0%, #0f0f0f 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 28,
          padding: '40px 32px 32px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.8), 0 0 60px rgba(99,102,241,0.1)',
        }}
      >
        {/* Glow */}
        <div style={{
          position: 'absolute', top: '-30%', left: '50%', transform: 'translateX(-50%)',
          width: 300, height: 300,
          background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ fontSize: 48, marginBottom: 16 }}>🔥</div>
        <h2 style={{ color: 'white', fontSize: 32, fontWeight: 900, letterSpacing: -0.5, marginBottom: 8 }}>
          {t('match_title')}
        </h2>
        <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
          {t('match_body', { name: username ?? t('gen_athlete') })}
        </p>

        {avatarUrl && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl}
              alt={username ?? 'athlete'}
              style={{
                width: 80, height: 80, borderRadius: '50%', objectFit: 'cover',
                border: '3px solid #6366F1',
                boxShadow: '0 0 20px rgba(99,102,241,0.4)',
              }}
            />
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              width: '100%', padding: '14px',
              background: 'linear-gradient(135deg, #6366F1, #818CF8)',
              border: 'none', borderRadius: 14,
              color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(99,102,241,0.35)',
              letterSpacing: '0.03em',
            }}
          >
            {t('match_swipe')}
          </button>
          <button
            onClick={() => { onClose(); router.push(`/messages?partner=${authEmail}&name=${encodeURIComponent(username ?? '')}`); }}
            style={{
              width: '100%', padding: '14px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 14,
              color: '#aaa', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {t('match_msg')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SwipeStack({ athletes, onRefresh }: SwipeStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matchedAthlete, setMatchedAthlete] = useState<MatchResult | null>(null);
  const { t } = useLang();

  const remaining = athletes.slice(currentIndex);
  const topThree = remaining.slice(0, 3);

  const handleSwipe = useCallback(async (athlete: MatchResult, direction: 'like' | 'pass') => {
    try {
      const res = await fetch('/api/swipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: athlete.user.authEmail, direction }),
      });

      if (res.ok) {
        const data = await res.json() as { match: boolean };
        if (data.match && direction === 'like') {
          setMatchedAthlete(athlete);
        }
      }
    } catch (err) {
      console.error('Swipe error:', err);
    }

    setCurrentIndex((prev) => prev + 1);
  }, []);

  const handleLike = useCallback((athlete: MatchResult) => {
    handleSwipe(athlete, 'like');
  }, [handleSwipe]);

  const handlePass = useCallback((athlete: MatchResult) => {
    handleSwipe(athlete, 'pass');
  }, [handleSwipe]);

  // Keyboard accessibility: ArrowRight/Enter to like, ArrowLeft/Backspace to pass
  useEffect(() => {
    if (remaining.length === 0) return;
    const topAthlete = remaining[0];

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        handleLike(topAthlete);
      } else if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
        e.preventDefault();
        handlePass(topAthlete);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [remaining, handleLike, handlePass]);

  // Empty state
  if (remaining.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-6 min-h-[500px]">
        <div className="text-6xl" style={{ animation: 'pulse 2s ease-in-out infinite' }}>🏃</div>
        <h3 className="font-display text-2xl text-zinc-500 tracking-wider">{t('discover_seen_all')}</h3>
        <p className="text-zinc-600 text-sm text-center max-w-xs">
          {t('discover_seen_desc')}
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
      {/* Screen reader live region — announces match popup */}
      <div
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {matchedAthlete
          ? t('match_title') + ' ' + t('match_body', { name: matchedAthlete.user.username ?? t('gen_athlete') })
          : ''}
      </div>

      {matchedAthlete && (
        <MatchPopup
          username={matchedAthlete.user.username}
          avatarUrl={matchedAthlete.user.avatarUrl}
          authEmail={matchedAthlete.user.authEmail}
          onClose={() => setMatchedAthlete(null)}
        />
      )}

      {/* Counter */}
      <div className="text-center mb-4">
        <span className="text-zinc-500 text-sm">
          {currentIndex + 1} / {athletes.length}
        </span>
      </div>

      {/* Card stack */}
      {/* Card stack — height fills viewport minus bottom nav (~70px) and top controls (~130px) */}
      <div className="relative mx-auto md:max-w-[400px]" style={{ width: '100%', height: 'clamp(340px, calc(100dvh - 200px), 700px)' }}>
        {topThree
          .slice()
          .reverse()
          .map((item, reversedIndex) => {
            const stackIndex = topThree.length - 1 - reversedIndex; // 0 = top
            const isTop = stackIndex === 0;
            const scaleOffset = stackIndex * 0.04;
            const yOffset = stackIndex * 12;

            return (
              <SwipeCard
                key={item.user.authEmail}
                athlete={{
                  authEmail: item.user.authEmail,
                  username: item.user.username,
                  avatarUrl: item.user.avatarUrl,
                  bio: item.user.bio,
                  sportTypes: item.user.sportTypes,
                  pacePerKm: item.user.pacePerKm,
                  weeklyKm: item.user.weeklyKm,
                  city: item.user.city,
                  stravaVerified: item.user.stravaVerified,
                  profileSongUrl: item.user.profileSongUrl,
                  ftpWatts: item.user.ftpWatts,
                }}
                score={item.score}
                distanceKm={item.distanceKm}
                onLike={() => handleLike(item)}
                onPass={() => handlePass(item)}
                onSuperLike={() => handleLike(item)}
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

      {/* Swipe hint */}
      <p className="text-center text-zinc-600 text-xs mt-6">
        {t('discover_swipe_hint')}
      </p>
    </>
  );
}
