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
  id,
  title,
  sportType,
  date,
  time,
  location,
  maxParticipants,
  participantCount,
  description,
  status,
  creatorName,
}: SessionCardProps) {
  const spotsLeft = maxParticipants - participantCount;
  const isFull = spotsLeft <= 0;
  const fillPct = Math.min(100, (participantCount / maxParticipants) * 100);

  return (
    <Link href={`/sessions/${id}`} className="block">
      <div className="bg-[#111111] border border-[#2A2A2A] card-hover p-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge sport={sportType}>{getSportLabel(sportType)}</Badge>
              {status === 'cancelled' && (
                <Badge variant="outline" className="border-red-500 text-red-400">
                  Cancelled
                </Badge>
              )}
              {isFull && status !== 'cancelled' && (
                <Badge variant="muted">Full</Badge>
              )}
            </div>
            <h3 className="font-semibold text-white text-sm line-clamp-1">{title}</h3>
          </div>
        </div>

        {description && (
          <p className="text-xs text-[#888888] line-clamp-2 leading-relaxed">{description}</p>
        )}

        {/* Details */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#FF4500]" />
            <span className="text-xs text-[#888888]">{date}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#FF4500]" />
            <span className="text-xs text-[#888888]">{time}</span>
          </div>
          <div className="flex items-center gap-1.5 col-span-2">
            <MapPin className="w-3.5 h-3.5 text-[#FF4500] shrink-0" />
            <span className="text-xs text-[#888888] line-clamp-1">{location}</span>
          </div>
        </div>

        {/* Participants */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#888888]" />
              <span className="text-xs text-[#888888]">
                {participantCount}/{maxParticipants} athletes
              </span>
            </div>
            <span
              className="text-xs font-semibold"
              style={{ color: isFull ? '#888888' : '#FF4500' }}
            >
              {isFull ? 'Full' : `${spotsLeft} spots left`}
            </span>
          </div>
          <div className="h-1 bg-[#1A1A1A] w-full">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${fillPct}%`,
                background: isFull ? '#888888' : '#FF4500',
              }}
            />
          </div>
        </div>

        {creatorName && (
          <p className="text-[10px] text-[#444444] uppercase tracking-wider">
            by {creatorName}
          </p>
        )}
      </div>
    </Link>
  );
}
