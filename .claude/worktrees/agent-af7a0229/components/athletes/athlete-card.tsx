'use client';

import Link from 'next/link';
import { MapPin, Zap, Route } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatPaceMin, getSportLabel, getMatchScoreColor } from '@/lib/utils';

interface AthleteCardProps {
  id: string;
  username: string | null;
  avatarUrl: string | null;
  bio: string | null;
  sportTypes: string[];
  pacePerKm: number | null;
  weeklyKm: number | null;
  city: string | null;
  score: number;
  distanceKm: number | null;
}

export function AthleteCard({
  id,
  username,
  avatarUrl,
  bio,
  sportTypes,
  pacePerKm,
  weeklyKm,
  city,
  score,
  distanceKm,
}: AthleteCardProps) {
  const scoreColor = getMatchScoreColor(score);

  return (
    <Link href={`/profile/${id}`} className="block">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] card-hover p-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar src={avatarUrl} fallback={username ?? '?'} size="lg" />
            <div>
              <h3 className="font-semibold text-white text-sm">
                {username ?? 'Anonymous Athlete'}
              </h3>
              {city && (
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-[#888888]" />
                  <span className="text-xs text-[#888888]">{city}</span>
                  {distanceKm !== null && (
                    <span className="text-xs text-[#888888]">
                      · {distanceKm < 1 ? '<1' : Math.round(distanceKm)}km away
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Match score */}
          <div className="flex flex-col items-center">
            <div
              className="font-display text-2xl leading-none"
              style={{ color: scoreColor }}
            >
              {score}%
            </div>
            <span className="text-[10px] text-[#888888] uppercase tracking-wider">match</span>
          </div>
        </div>

        {/* Sports */}
        {sportTypes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {sportTypes.slice(0, 3).map((sport) => (
              <Badge key={sport} sport={sport}>
                {getSportLabel(sport)}
              </Badge>
            ))}
            {sportTypes.length > 3 && (
              <Badge variant="muted">+{sportTypes.length - 3}</Badge>
            )}
          </div>
        )}

        {/* Bio */}
        {bio && (
          <p className="text-xs text-[#888888] line-clamp-2 leading-relaxed">{bio}</p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 pt-1 border-t border-[var(--border)]">
          {pacePerKm && (
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#7C3AED]" />
              <span className="text-xs text-[#888888]">
                {formatPaceMin(pacePerKm)}/km
              </span>
            </div>
          )}
          {weeklyKm && (
            <div className="flex items-center gap-1.5">
              <Route className="w-3.5 h-3.5 text-[#7C3AED]" />
              <span className="text-xs text-[#888888]">{weeklyKm} km/wk</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
