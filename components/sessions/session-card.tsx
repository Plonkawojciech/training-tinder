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
    <Link href={`/sessions/${id}`} className="block">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] p-4 hover:border-[#6366F1] transition-all flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
              <Badge sport={sportType}>{getSportLabel(sportType)}</Badge>
              {status === 'cancelled' && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 text-red-400 bg-red-900/10 border border-red-800/30">
                  Anulowana
                </span>
              )}
              {isFull && status !== 'cancelled' && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 text-[var(--text-muted)] bg-[var(--bg-elevated)] border border-[var(--border)]">
                  Pełna
                </span>
              )}
            </div>
            <h3 className="font-semibold text-[var(--text)] text-sm line-clamp-1">{title}</h3>
          </div>
        </div>

        {description && (
          <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">{description}</p>
        )}

        {/* Details */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 flex items-center justify-center bg-[rgba(99,102,241,0.1)] border border-[rgba(99,102,241,0.2)]">
              <Calendar className="w-3.5 h-3.5 text-[#6366F1]" />
            </div>
            <span className="text-xs text-[var(--text-muted)]">{date}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 flex items-center justify-center bg-[rgba(99,102,241,0.1)] border border-[rgba(99,102,241,0.2)]">
              <Clock className="w-3.5 h-3.5 text-[#6366F1]" />
            </div>
            <span className="text-xs text-[var(--text-muted)]">{time}</span>
          </div>
          <div className="flex items-center gap-2 col-span-2">
            <div className="w-7 h-7 flex items-center justify-center bg-[rgba(99,102,241,0.1)] border border-[rgba(99,102,241,0.2)] shrink-0">
              <MapPin className="w-3.5 h-3.5 text-[#6366F1]" />
            </div>
            <span className="text-xs text-[var(--text-muted)] truncate">{location}</span>
          </div>
        </div>

        {/* Participants bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Users className="w-3 h-3 text-[var(--text-muted)]" />
              <span className="text-xs text-[var(--text-muted)]">{participantCount}/{maxParticipants}</span>
            </div>
            <span className={`text-xs font-semibold ${isFull ? 'text-[var(--text-muted)]' : 'text-[#6366F1]'}`}>
              {isFull ? 'Pełna' : `${spotsLeft} miejsc`}
            </span>
          </div>
          <div className="h-1 bg-[var(--bg-elevated)] overflow-hidden">
            <div
              className="h-full transition-all duration-300"
              style={{ width: `${fillPct}%`, background: isFull ? 'var(--text-dim)' : '#6366F1' }}
            />
          </div>
        </div>

        {creatorName && (
          <p className="text-[10px] text-[var(--text-dim)]">
            przez {creatorName}
          </p>
        )}
      </div>
    </Link>
  );
}
