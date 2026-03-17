'use client';

import Link from 'next/link';
import { Calendar, MapPin, Users, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getSportLabel } from '@/lib/utils';

interface SessionCardProps {
  id: number;
  title: string;
  sportType: string;
  date: string;
  time: string;
  location: string;
  maxParticipants: number;
  participantCount: number;
  description?: string | null;
  status: string;
  creatorName?: string | null;
}

export function SessionCard({
  id, title, sportType, date, time, location,
  maxParticipants, participantCount, description, status, creatorName,
}: SessionCardProps) {
  const spotsLeft = maxParticipants - participantCount;
  const isFull = spotsLeft <= 0;
  const fillPct = Math.min(100, (participantCount / maxParticipants) * 100);

  return (
    <Link href={`/sessions/${id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 20,
        boxShadow: 'var(--shadow-card)',
        padding: '16px',
        display: 'flex', flexDirection: 'column', gap: 12,
        transition: 'all 0.2s ease',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
              <Badge sport={sportType}>{getSportLabel(sportType)}</Badge>
              {status === 'cancelled' && (
                <span style={{ fontSize: 11, fontWeight: 600, color: '#EF4444', background: 'rgba(239,68,68,0.1)', borderRadius: 99, padding: '2px 8px' }}>
                  Anulowana
                </span>
              )}
              {isFull && status !== 'cancelled' && (
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-elevated)', borderRadius: 99, padding: '2px 8px' }}>
                  Pełna
                </span>
              )}
            </div>
            <h3 style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', lineHeight: 1.3 }} className="line-clamp-1">{title}</h3>
          </div>
        </div>

        {description && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }} className="line-clamp-2">{description}</p>
        )}

        {/* Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar style={{ width: 14, height: 14, color: '#7C3AED' }} />
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{date}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock style={{ width: 14, height: 14, color: '#7C3AED' }} />
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{time}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, gridColumn: '1 / -1' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MapPin style={{ width: 14, height: 14, color: '#7C3AED' }} />
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{location}</span>
          </div>
        </div>

        {/* Participants bar */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Users style={{ width: 13, height: 13, color: 'var(--text-muted)' }} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{participantCount}/{maxParticipants}</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: isFull ? 'var(--text-muted)' : '#7C3AED' }}>
              {isFull ? 'Pełna' : `${spotsLeft} miejsc`}
            </span>
          </div>
          <div style={{ height: 4, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${fillPct}%`, background: isFull ? 'var(--text-dim)' : '#7C3AED', borderRadius: 99, transition: 'width 0.3s' }} />
          </div>
        </div>

        {creatorName && (
          <p style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 500 }}>
            przez {creatorName}
          </p>
        )}
      </div>
    </Link>
  );
}
