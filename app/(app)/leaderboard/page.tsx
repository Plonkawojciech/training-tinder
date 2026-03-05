'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Trophy, Route, Dumbbell, Crown } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getSportLabel } from '@/lib/utils';

interface LeaderboardEntry {
  rank: number;
  clerkId: string;
  username: string | null;
  avatarUrl: string | null;
  sportTypes: string[];
  weeklyKm: number;
  sessionCount: number;
  city: string | null;
  isCurrentUser: boolean;
}

type SortBy = 'weeklyKm' | 'sessions';

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortBy>('weeklyKm');

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const res = await fetch('/api/leaderboard');
        if (res.ok) {
          const data: LeaderboardEntry[] = await res.json();
          setEntries(data);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, []);

  const sorted = [...entries].sort((a, b) =>
    sortBy === 'weeklyKm' ? b.weeklyKm - a.weeklyKm : b.sessionCount - a.sessionCount
  );

  function getRankColor(rank: number): string {
    if (rank === 1) return '#FFD700';
    if (rank === 2) return '#C0C0C0';
    if (rank === 3) return '#CD7F32';
    return '#888888';
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="w-6 h-6 text-[#FF4500]" />
        <div>
          <h1 className="font-display text-3xl text-white tracking-wider">LEADERBOARD</h1>
          <p className="text-[#888888] text-sm">Top athletes in your community</p>
        </div>
      </div>

      {/* Sort tabs */}
      <div className="flex gap-0 mb-6 border-b border-[#2A2A2A]">
        <button
          onClick={() => setSortBy('weeklyKm')}
          className="px-6 py-3 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2"
          style={
            sortBy === 'weeklyKm'
              ? { color: '#FF4500', borderColor: '#FF4500' }
              : { color: '#888888', borderColor: 'transparent' }
          }
        >
          <Route className="w-3.5 h-3.5" />
          Weekly Distance
        </button>
        <button
          onClick={() => setSortBy('sessions')}
          className="px-6 py-3 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2"
          style={
            sortBy === 'sessions'
              ? { color: '#FF4500', borderColor: '#FF4500' }
              : { color: '#888888', borderColor: 'transparent' }
          }
        >
          <Dumbbell className="w-3.5 h-3.5" />
          Sessions
        </button>
      </div>

      {/* Top 3 podium */}
      {!loading && sorted.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {/* 2nd place */}
          <Link href={`/profile/${sorted[1].clerkId}`}>
            <div className="bg-[#111111] border border-[#2A2A2A] p-4 text-center card-hover mt-8">
              <div className="flex items-center justify-center mb-2">
                <Crown className="w-5 h-5" style={{ color: '#C0C0C0' }} />
              </div>
              <Avatar
                src={sorted[1].avatarUrl}
                fallback={sorted[1].username ?? '?'}
                size="lg"
                className="mx-auto mb-2"
              />
              <p className="text-white text-sm font-semibold truncate">{sorted[1].username}</p>
              <p className="font-display text-2xl" style={{ color: '#C0C0C0' }}>2nd</p>
              <p className="text-xs text-[#888888]">
                {sortBy === 'weeklyKm' ? `${sorted[1].weeklyKm} km/wk` : `${sorted[1].sessionCount} sessions`}
              </p>
            </div>
          </Link>

          {/* 1st place */}
          <Link href={`/profile/${sorted[0].clerkId}`}>
            <div
              className="bg-[#111111] border p-4 text-center card-hover"
              style={{ borderColor: '#FFD700' }}
            >
              <div className="flex items-center justify-center mb-2">
                <Crown className="w-6 h-6" style={{ color: '#FFD700' }} />
              </div>
              <Avatar
                src={sorted[0].avatarUrl}
                fallback={sorted[0].username ?? '?'}
                size="xl"
                className="mx-auto mb-2"
                style={{ borderColor: '#FFD700' }}
              />
              <p className="text-white text-sm font-semibold truncate">{sorted[0].username}</p>
              <p className="font-display text-3xl" style={{ color: '#FFD700' }}>1st</p>
              <p className="text-xs text-[#888888]">
                {sortBy === 'weeklyKm' ? `${sorted[0].weeklyKm} km/wk` : `${sorted[0].sessionCount} sessions`}
              </p>
            </div>
          </Link>

          {/* 3rd place */}
          <Link href={`/profile/${sorted[2].clerkId}`}>
            <div className="bg-[#111111] border border-[#2A2A2A] p-4 text-center card-hover mt-8">
              <div className="flex items-center justify-center mb-2">
                <Crown className="w-5 h-5" style={{ color: '#CD7F32' }} />
              </div>
              <Avatar
                src={sorted[2].avatarUrl}
                fallback={sorted[2].username ?? '?'}
                size="lg"
                className="mx-auto mb-2"
              />
              <p className="text-white text-sm font-semibold truncate">{sorted[2].username}</p>
              <p className="font-display text-2xl" style={{ color: '#CD7F32' }}>3rd</p>
              <p className="text-xs text-[#888888]">
                {sortBy === 'weeklyKm' ? `${sorted[2].weeklyKm} km/wk` : `${sorted[2].sessionCount} sessions`}
              </p>
            </div>
          </Link>
        </div>
      )}

      {/* Full list */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-16 skeleton" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-20">
          <Trophy className="w-12 h-12 text-[#2A2A2A] mx-auto mb-4" />
          <h3 className="font-display text-xl text-[#888888]">BE THE FIRST</h3>
          <p className="text-[#888888] text-sm">Complete your profile to appear on the leaderboard</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {sorted.map((entry, index) => (
            <Link key={entry.clerkId} href={`/profile/${entry.clerkId}`}>
              <div
                className="flex items-center gap-4 p-4 bg-[#111111] border card-hover"
                style={
                  entry.isCurrentUser
                    ? { borderColor: '#FF4500' }
                    : { borderColor: '#2A2A2A' }
                }
              >
                {/* Rank */}
                <div
                  className="w-10 text-center font-display text-xl shrink-0"
                  style={{ color: getRankColor(index + 1) }}
                >
                  {index + 1}
                </div>

                {/* Avatar */}
                <Avatar
                  src={entry.avatarUrl}
                  fallback={entry.username ?? '?'}
                  size="md"
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm truncate">
                    {entry.username ?? 'Anonymous'}
                    {entry.isCurrentUser && (
                      <span className="ml-2 text-[10px] text-[#FF4500] uppercase tracking-wider">You</span>
                    )}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {entry.city && (
                      <span className="text-xs text-[#888888]">{entry.city}</span>
                    )}
                    {entry.sportTypes.slice(0, 2).map((s) => (
                      <Badge key={s} sport={s} className="text-[10px]">
                        {getSportLabel(s).slice(0, 4)}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="text-right shrink-0">
                  <p
                    className="font-display text-xl"
                    style={{ color: getRankColor(index + 1) }}
                  >
                    {sortBy === 'weeklyKm' ? `${entry.weeklyKm}` : `${entry.sessionCount}`}
                  </p>
                  <p className="text-[10px] text-[#888888] uppercase tracking-wider">
                    {sortBy === 'weeklyKm' ? 'km/wk' : 'sessions'}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
