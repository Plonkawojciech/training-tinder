'use client';

import { useState, useRef, useCallback } from 'react';
import { MapPin, Zap, Route, CheckCircle, X, Heart, Star } from 'lucide-react';
import { getSportLabel, formatPaceMin } from '@/lib/utils';
import { useLang } from '@/lib/lang';

export interface SwipeCardAthlete {
  clerkId: string;
  username: string | null;
  avatarUrl: string | null;
  bio: string | null;
  sportTypes: string[];
  pacePerKm: number | null;
  weeklyKm: number | null;
  city: string | null;
  stravaVerified?: boolean;
  profileSongUrl?: string | null;
  ftpWatts?: number | null;
}

export interface SwipeCardProps {
  athlete: SwipeCardAthlete;
  score: number;
  distanceKm: number | null;
  onLike: () => void;
  onPass: () => void;
  onSuperLike?: () => void;
  style?: React.CSSProperties;
  isTop?: boolean;
}

const SWIPE_THRESHOLD = 80;

const SPORT_COLORS: Record<string, string> = {
  cycling: '#6366F1',
  running: '#00C851',
  triathlon: '#7B68EE',
  swimming: '#00B4D8',
  trail_running: '#27AE60',
  gravel: '#818CF8',
  duathlon: '#9B59B6',
  mtb: '#44FF88',
  gym: '#A78BFA',
  crossfit: '#6D28D9',
  default: '#6366F1',
};

function getSportBadgeColor(sport: string) {
  return SPORT_COLORS[sport] ?? SPORT_COLORS.default;
}

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    let videoId: string | null = null;
    if (u.hostname.includes('youtube.com')) {
      videoId = u.searchParams.get('v');
    } else if (u.hostname === 'youtu.be') {
      videoId = u.pathname.slice(1);
    }
    if (!videoId) return null;
    return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&controls=0&mute=0&loop=1&playlist=${videoId}&modestbranding=1`;
  } catch { return null; }
}

function getSpotifyEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes('spotify.com')) return null;
    const path = u.pathname; // /track/ID or /playlist/ID
    return `https://open.spotify.com/embed${path}?utm_source=generator&theme=0`;
  } catch { return null; }
}

export function SwipeCard({
  athlete,
  score,
  distanceKm,
  onLike,
  onPass,
  onSuperLike,
  style,
  isTop = false,
}: SwipeCardProps) {
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });

  const { t } = useLang();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isFlying, setIsFlying] = useState(false);
  const [flyDirection, setFlyDirection] = useState<'left' | 'right' | 'up' | null>(null);

  const deltaX = dragState.isDragging ? dragState.currentX - dragState.startX : 0;
  const deltaY = dragState.isDragging ? dragState.currentY - dragState.startY : 0;
  const rotation = deltaX * 0.07;
  const likeOpacity = Math.min(1, Math.max(0, deltaX / 70));
  const passOpacity = Math.min(1, Math.max(0, -deltaX / 70));
  const superOpacity = Math.min(1, Math.max(0, -deltaY / 60));

  const startDrag = useCallback((clientX: number, clientY: number) => {
    if (!isTop || isFlying) return;
    setDragState({ isDragging: true, startX: clientX, startY: clientY, currentX: clientX, currentY: clientY });
  }, [isTop, isFlying]);

  const moveDrag = useCallback((clientX: number, clientY: number) => {
    if (!dragState.isDragging) return;
    setDragState((prev) => ({ ...prev, currentX: clientX, currentY: clientY }));
  }, [dragState.isDragging]);

  const endDrag = useCallback(() => {
    if (!dragState.isDragging) return;
    const dx = dragState.currentX - dragState.startX;
    const dy = dragState.currentY - dragState.startY;

    setDragState({ isDragging: false, startX: 0, startY: 0, currentX: 0, currentY: 0 });

    if (dy < -100 && Math.abs(dx) < 60) {
      setFlyDirection('up');
      setIsFlying(true);
      setTimeout(() => onSuperLike?.(), 300);
    } else if (dx > SWIPE_THRESHOLD) {
      setFlyDirection('right');
      setIsFlying(true);
      setTimeout(() => onLike(), 300);
    } else if (dx < -SWIPE_THRESHOLD) {
      setFlyDirection('left');
      setIsFlying(true);
      setTimeout(() => onPass(), 300);
    }
  }, [dragState, onLike, onPass, onSuperLike]);

  const handleMouseDown = (e: React.MouseEvent) => { e.preventDefault(); startDrag(e.clientX, e.clientY); };
  const handleMouseMove = (e: React.MouseEvent) => { moveDrag(e.clientX, e.clientY); };
  const handleMouseUp = () => endDrag();
  const handleMouseLeave = () => { if (dragState.isDragging) endDrag(); };

  const handleTouchStart = (e: React.TouchEvent) => { const t = e.touches[0]; startDrag(t.clientX, t.clientY); };
  const handleTouchMove = (e: React.TouchEvent) => { const t = e.touches[0]; moveDrag(t.clientX, t.clientY); };
  const handleTouchEnd = () => endDrag();

  const handleLikeBtn = () => {
    if (!isTop || isFlying) return;
    setFlyDirection('right'); setIsFlying(true);
    setTimeout(() => onLike(), 300);
  };
  const handlePassBtn = () => {
    if (!isTop || isFlying) return;
    setFlyDirection('left'); setIsFlying(true);
    setTimeout(() => onPass(), 300);
  };
  const handleSuperBtn = () => {
    if (!isTop || isFlying) return;
    setFlyDirection('up'); setIsFlying(true);
    setTimeout(() => onSuperLike?.(), 300);
  };

  let transform = '';
  let transition = '';

  if (isFlying) {
    if (flyDirection === 'right') transform = 'translateX(700px) rotate(30deg)';
    else if (flyDirection === 'left') transform = 'translateX(-700px) rotate(-30deg)';
    else transform = 'translateY(-700px) scale(0.8)';
    transition = 'transform 0.38s cubic-bezier(0.4, 0, 0.6, 1), opacity 0.38s ease-in';
  } else if (dragState.isDragging) {
    transform = `translateX(${deltaX}px) translateY(${deltaY * 0.25}px) rotate(${rotation}deg)`;
    transition = 'none';
  } else {
    transform = 'translateX(0) translateY(0) rotate(0deg)';
    transition = 'transform 0.42s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
  }

  const initials = athlete.username
    ? athlete.username.slice(0, 2).toUpperCase()
    : '??';

  const matchColor = score >= 80 ? '#00E676' : score >= 60 ? '#FFD700' : score >= 40 ? '#FF9800' : '#6366F1';
  const primarySport = athlete.sportTypes[0];
  const sportColor = primarySport ? getSportBadgeColor(primarySport) : '#6366F1';

  return (
    <div
      ref={cardRef}
      className="absolute inset-0 select-none"
      style={{
        ...style,
        transform,
        transition,
        opacity: isFlying ? 0 : 1,
        cursor: isTop ? (dragState.isDragging ? 'grabbing' : 'grab') : 'default',
        userSelect: 'none',
        touchAction: 'none',
        WebkitUserSelect: 'none',
      }}
      onMouseDown={isTop ? handleMouseDown : undefined}
      onMouseMove={isTop ? handleMouseMove : undefined}
      onMouseUp={isTop ? handleMouseUp : undefined}
      onMouseLeave={isTop ? handleMouseLeave : undefined}
      onTouchStart={isTop ? handleTouchStart : undefined}
      onTouchMove={isTop ? handleTouchMove : undefined}
      onTouchEnd={isTop ? handleTouchEnd : undefined}
    >
      <div
        className="w-full h-full overflow-hidden relative"
        style={{
          borderRadius: 32,
          background: '#111',
          boxShadow: isTop
            ? '0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)'
            : '0 8px 24px rgba(0,0,0,0.5)',
        }}
      >
        {/* Avatar / Background */}
        <div className="absolute inset-0">
          {athlete.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={athlete.avatarUrl}
              alt={athlete.username ?? 'athlete'}
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{
                background: `linear-gradient(145deg, ${sportColor}18 0%, #0d0d0d 60%)`,
              }}
            >
              <span
                style={{
                  fontSize: 96,
                  fontWeight: 900,
                  color: `${sportColor}30`,
                  letterSpacing: -2,
                  userSelect: 'none',
                }}
              >
                {initials}
              </span>
            </div>
          )}
        </div>

        {/* Multi-layer gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: athlete.avatarUrl
              ? 'linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0.05) 75%, transparent 100%)'
              : 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)',
          }}
        />

        {/* Swipe direction tint overlays */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `rgba(0,230,118,${likeOpacity * 0.25})`,
            transition: 'background 0.05s',
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `rgba(255,59,48,${passOpacity * 0.25})`,
            transition: 'background 0.05s',
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `rgba(30,144,255,${superOpacity * 0.25})`,
            transition: 'background 0.05s',
          }}
        />

        {/* Profile song iframe — only mounted when this is the top card */}
        {isTop && athlete.profileSongUrl && (() => {
          const ytUrl = getYouTubeEmbedUrl(athlete.profileSongUrl);
          if (ytUrl) return (
            <iframe
              key={athlete.clerkId}
              src={ytUrl}
              style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none', zIndex: -1 }}
              allow="autoplay"
              title="profile-song"
            />
          );
          const spUrl = getSpotifyEmbedUrl(athlete.profileSongUrl ?? '');
          if (spUrl) return (
            <iframe
              key={athlete.clerkId}
              src={spUrl}
              style={{ position: 'absolute', bottom: 0, right: 0, width: 300, height: 80, borderRadius: 20, zIndex: 3 }}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              title="profile-song"
            />
          );
          return null;
        })()}

        {/* LIKE stamp */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: 28,
            left: 20,
            opacity: likeOpacity,
            transform: `rotate(-15deg) scale(${0.7 + likeOpacity * 0.3})`,
            transition: 'none',
          }}
        >
          <div style={{
            border: '4px solid #00E676',
            borderRadius: 18,
            padding: '4px 16px',
            color: '#00E676',
            fontSize: 28,
            fontWeight: 900,
            letterSpacing: 2,
            textShadow: '0 0 20px rgba(0,230,118,0.6)',
          }}>
            {t('card_like')}
          </div>
        </div>

        {/* PASS stamp */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: 28,
            right: 20,
            opacity: passOpacity,
            transform: `rotate(15deg) scale(${0.7 + passOpacity * 0.3})`,
            transition: 'none',
          }}
        >
          <div style={{
            border: '4px solid #FF3B30',
            borderRadius: 18,
            padding: '4px 16px',
            color: '#FF3B30',
            fontSize: 28,
            fontWeight: 900,
            letterSpacing: 2,
            textShadow: '0 0 20px rgba(255,59,48,0.6)',
          }}>
            {t('card_pass')}
          </div>
        </div>

        {/* SUPER stamp */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '40%',
            left: '50%',
            transform: `translate(-50%, -50%) scale(${0.7 + superOpacity * 0.3})`,
            opacity: superOpacity,
            transition: 'none',
          }}
        >
          <div style={{
            border: '4px solid #1E90FF',
            borderRadius: 18,
            padding: '4px 16px',
            color: '#1E90FF',
            fontSize: 24,
            fontWeight: 900,
            letterSpacing: 2,
            textShadow: '0 0 20px rgba(30,144,255,0.6)',
          }}>
            {t('card_super')}
          </div>
        </div>

        {/* Top badges */}
        <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
          <div
            style={{
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(8px)',
              borderRadius: 99,
              padding: '4px 12px',
              border: `1px solid ${matchColor}40`,
              color: matchColor,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.03em',
            }}
          >
            {score}% dopasowanie
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {athlete.stravaVerified && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(8px)',
                borderRadius: 99,
                padding: '4px 10px',
                border: '1px solid rgba(0,204,68,0.4)',
                color: '#00CC44',
                fontSize: 11,
                fontWeight: 700,
              }}>
                <CheckCircle style={{ width: 12, height: 12 }} />
                Strava
              </div>
            )}
            {athlete.profileSongUrl && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(8px)',
                borderRadius: 99,
                padding: '4px 10px',
                border: '1px solid rgba(139,92,246,0.4)',
                color: '#A78BFA',
                fontSize: 11,
                fontWeight: 700,
              }}>
                🎵 muzyka
              </div>
            )}
          </div>
        </div>

        {/* Bottom content */}
        <div className="absolute bottom-0 left-0 right-0" style={{ padding: '0 20px 18px' }}>
          {/* Name & city */}
          <div style={{ marginBottom: 8 }}>
            <h2 style={{
              color: 'white',
              fontSize: 26,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: -0.3,
              textShadow: '0 2px 8px rgba(0,0,0,0.8)',
            }}>
              {athlete.username ?? 'Sportowiec'}
            </h2>
            {(athlete.city || distanceKm !== null) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <MapPin style={{ width: 13, height: 13, color: '#bbb' }} />
                <span style={{ color: '#ccc', fontSize: 13 }}>
                  {athlete.city}
                  {distanceKm !== null && (
                    <span style={{ color: '#999' }}>
                      {athlete.city ? ' · ' : ''}
                      {distanceKm < 1 ? '<1' : Math.round(distanceKm)}km
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Sport tags */}
          {athlete.sportTypes.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {athlete.sportTypes.slice(0, 3).map((sport) => {
                const c = getSportBadgeColor(sport);
                return (
                  <span key={sport} style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 99,
                    background: `${c}22`,
                    border: `1px solid ${c}55`,
                    color: c,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}>
                    {getSportLabel(sport)}
                  </span>
                );
              })}
              {athlete.sportTypes.length > 3 && (
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: 99,
                  background: 'rgba(255,255,255,0.08)',
                  color: '#999',
                }}>
                  +{athlete.sportTypes.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Bio */}
          {athlete.bio && (
            <p style={{
              color: 'rgba(255,255,255,0.65)',
              fontSize: 12,
              lineHeight: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              marginBottom: 10,
            }}>
              {athlete.bio}
            </p>
          )}

          {/* Stats row */}
          {(() => {
            const isCycling = athlete.sportTypes.some((s) =>
              ['cycling', 'gravel', 'mtb', 'triathlon', 'duathlon'].includes(s)
            );
            const showFtp = isCycling && athlete.ftpWatts;
            const showPace = !isCycling && athlete.pacePerKm;
            if (!showFtp && !showPace && !athlete.weeklyKm) return null;
            return (
              <div style={{
                display: 'flex',
                gap: 16,
                marginBottom: 16,
                paddingTop: 8,
                borderTop: '1px solid rgba(255,255,255,0.1)',
              }}>
                {showFtp && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Zap style={{ width: 13, height: 13, color: '#6366F1' }} />
                    <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: 600 }}>
                      {athlete.ftpWatts} W FTP
                    </span>
                  </div>
                )}
                {showPace && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Zap style={{ width: 13, height: 13, color: '#A78BFA' }} />
                    <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: 600 }}>
                      {formatPaceMin(athlete.pacePerKm!)}/km
                    </span>
                  </div>
                )}
                {athlete.weeklyKm && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Route style={{ width: 13, height: 13, color: '#A78BFA' }} />
                    <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: 600 }}>
                      {athlete.weeklyKm} km/wk
                    </span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Action buttons — only on top card */}
          {isTop && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              {/* Pass */}
              <button
                onClick={handlePassBtn}
                aria-label="Pass"
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'rgba(255,59,48,0.15)',
                  border: '2px solid rgba(255,59,48,0.6)',
                  color: '#FF3B30',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: '0 4px 16px rgba(255,59,48,0.2)',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,59,48,0.3)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,59,48,0.15)'; }}
              >
                <X style={{ width: 24, height: 24 }} />
              </button>

              {/* Super Like */}
              <button
                onClick={handleSuperBtn}
                aria-label="Super like"
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: '50%',
                  background: 'rgba(30,144,255,0.15)',
                  border: '2px solid rgba(30,144,255,0.5)',
                  color: '#1E90FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: '0 4px 12px rgba(30,144,255,0.2)',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(30,144,255,0.3)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(30,144,255,0.15)'; }}
              >
                <Star style={{ width: 20, height: 20 }} />
              </button>

              {/* Like */}
              <button
                onClick={handleLikeBtn}
                aria-label="Like"
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'rgba(0,230,118,0.15)',
                  border: '2px solid rgba(0,230,118,0.6)',
                  color: '#00E676',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: '0 4px 16px rgba(0,230,118,0.2)',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,230,118,0.3)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,230,118,0.15)'; }}
              >
                <Heart style={{ width: 24, height: 24 }} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
