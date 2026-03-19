'use client';

import { useState, useRef, useCallback } from 'react';
import { MapPin, Users, Calendar, X, Heart, ChevronRight } from 'lucide-react';
import { useLang } from '@/lib/lang';

const SPORT_EMOJIS: Record<string, string> = {
  cycling: '🚴', running: '🏃', gym: '🏋️', trail_running: '🌿',
  swimming: '🏊', triathlon: '🔱', crossfit: '💪', mtb: '🚵', default: '⚡',
};

const SPORT_COLORS: Record<string, string> = {
  cycling: '#6366F1', running: '#00C851', gym: '#A78BFA', trail_running: '#27AE60',
  swimming: '#00B4D8', triathlon: '#7B68EE', crossfit: '#6D28D9', mtb: '#44FF88', default: '#6366F1',
};

export interface SessionCardData {
  id: string;
  title: string;
  description: string | null;
  sportType: string;
  date: string;
  time: string | null;
  location: string | null;
  participantCount: number;
  maxParticipants: number | null;
  creatorName: string | null;
}

export interface SessionSwipeCardProps {
  session: SessionCardData;
  onJoin: () => void;
  onPass: () => void;
  style?: React.CSSProperties;
  isTop?: boolean;
}

const SWIPE_THRESHOLD = 80;

export function SessionSwipeCard({ session, onJoin, onPass, style, isTop }: SessionSwipeCardProps) {
  const { t, lang } = useLang();
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const sportEmoji = SPORT_EMOJIS[session.sportType] ?? SPORT_EMOJIS.default;
  const sportColor = SPORT_COLORS[session.sportType] ?? SPORT_COLORS.default;

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString(lang === 'pl' ? 'pl-PL' : 'en-GB', {
        weekday: 'short', day: 'numeric', month: 'short',
      });
    } catch { return d; }
  };

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!isTop) return;
    setIsDragging(true);
    startX.current = e.clientX;
    cardRef.current?.setPointerCapture(e.pointerId);
  }, [isTop]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    setDragX(e.clientX - startX.current);
  }, [isDragging]);

  const onPointerUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragX > SWIPE_THRESHOLD) onJoin();
    else if (dragX < -SWIPE_THRESHOLD) onPass();
    setDragX(0);
  }, [isDragging, dragX, onJoin, onPass]);

  const likeOpacity = Math.min(Math.max(dragX / SWIPE_THRESHOLD, 0), 1);
  const passOpacity = Math.min(Math.max(-dragX / SWIPE_THRESHOLD, 0), 1);

  const spotsLeft = session.maxParticipants
    ? session.maxParticipants - session.participantCount
    : null;
  const isFull = spotsLeft !== null && spotsLeft <= 0;

  return (
    <div
      ref={cardRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 28,
        overflow: 'hidden',
        cursor: isTop ? 'grab' : 'default',
        userSelect: 'none',
        touchAction: 'none',
        transform: `translateX(${dragX}px) rotate(${dragX * 0.03}deg)`,
        transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        willChange: 'transform',
        ...style,
      }}
    >
      {/* Background */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(160deg, #1a1025 0%, #0d0d1a 100%)`,
        border: `1px solid ${sportColor}33`,
      }} />

      {/* Sport color top accent */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 4,
        background: `linear-gradient(90deg, ${sportColor}, ${sportColor}88)`,
      }} />

      {/* Glow */}
      <div style={{
        position: 'absolute', top: -60, right: -60, width: 240, height: 240,
        background: `radial-gradient(circle, ${sportColor}18 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* LIKE overlay */}
      <div style={{
        position: 'absolute', top: 24, left: 24, zIndex: 10,
        opacity: likeOpacity,
        transform: `rotate(-12deg)`,
        border: '3px solid #00C851', borderRadius: 12,
        padding: '6px 16px',
        color: '#00C851', fontSize: 22, fontWeight: 900, letterSpacing: 2,
      }}>
        {t('discover_join')}
      </div>

      {/* PASS overlay */}
      <div style={{
        position: 'absolute', top: 24, right: 24, zIndex: 10,
        opacity: passOpacity,
        transform: `rotate(12deg)`,
        border: '3px solid #FF4458', borderRadius: 12,
        padding: '6px 16px',
        color: '#FF4458', fontSize: 22, fontWeight: 900, letterSpacing: 2,
      }}>
        {t('discover_pass')}
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, padding: '28px 24px 24px', height: '100%', display: 'flex', flexDirection: 'column' }}>

        {/* Top: sport + creator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 16,
              background: `${sportColor}22`, border: `1px solid ${sportColor}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22,
            }}>
              {sportEmoji}
            </div>
            <div>
              <div style={{ fontSize: 11, color: sportColor, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {session.sportType.replace('_', ' ')}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>
                {t('discover_by')} {session.creatorName ?? '?'}
              </div>
            </div>
          </div>
          {isFull ? (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 99, background: 'rgba(255,68,88,0.15)', color: '#FF4458', border: '1px solid rgba(255,68,88,0.3)' }}>
              {t('discover_full')}
            </span>
          ) : spotsLeft !== null ? (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 99, background: 'rgba(0,200,81,0.12)', color: '#00C851', border: '1px solid rgba(0,200,81,0.25)' }}>
              {spotsLeft} {t('discover_spots')}
            </span>
          ) : null}
        </div>

        {/* Title */}
        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'white', lineHeight: 1.2, marginBottom: 12, letterSpacing: -0.3 }}>
          {session.title}
        </h2>

        {/* Description */}
        {session.description && (
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, marginBottom: 16, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {session.description}
          </p>
        )}

        {/* Info chips */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
              {formatDate(session.date)}
              {session.time && ` · ${session.time}`}
            </span>
          </div>
          {session.location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MapPin style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{session.location}</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
              {session.participantCount}
              {session.maxParticipants ? ` / ${session.maxParticipants}` : ''} {t('discover_participants')}
            </span>
          </div>
        </div>

        {/* Bottom buttons */}
        {isTop && (
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onPass}
              style={{
                flex: 1, padding: '14px', borderRadius: 16, border: '1px solid rgba(255,68,88,0.3)',
                background: 'rgba(255,68,88,0.08)', color: '#FF4458',
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <X style={{ width: 16, height: 16 }} />
              {t('discover_pass_btn')}
            </button>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onJoin}
              style={{
                flex: 2, padding: '14px', borderRadius: 16, border: 'none',
                background: `linear-gradient(135deg, ${sportColor}, ${sportColor}cc)`,
                color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: `0 6px 20px ${sportColor}44`,
              }}
            >
              <Heart style={{ width: 16, height: 16 }} />
              {t('discover_join_btn')}
              <ChevronRight style={{ width: 14, height: 14 }} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
