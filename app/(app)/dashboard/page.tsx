'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Filter, RefreshCw, Users } from 'lucide-react';
import { AthleteCard } from '@/components/athletes/athlete-card';
import { SportFilter } from '@/components/athletes/sport-filter';
import { Button } from '@/components/ui/button';

interface MatchResult {
  user: {
    id: string;
    clerkId: string;
    username: string | null;
    avatarUrl: string | null;
    bio: string | null;
    sportTypes: string[];
    pacePerKm: number | null;
    weeklyKm: number | null;
    city: string | null;
  };
  score: number;
  distanceKm: number | null;
}

const RADIUS_OPTIONS = [5, 10, 25, 50, 100];

export default function DashboardPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [sport, setSport] = useState('all');
  const [radius, setRadius] = useState(50);
  const [showFilters, setShowFilters] = useState(false);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/matches?sport=${sport}&radius=${radius}`);
      if (res.ok) {
        const data: MatchResult[] = await res.json();
        setMatches(data);
      }
    } finally {
      setLoading(false);
    }
  }, [sport, radius]);

  useEffect(() => {
    async function checkProfile() {
      const res = await fetch('/api/users/profile');
      if (res.ok) {
        const data: { username?: string } | null = await res.json();
        if (!data?.username) {
          router.push('/onboarding');
          return;
        }
        setHasProfile(true);
        fetchMatches();
      }
    }
    checkProfile();
  }, [router, fetchMatches]);

  useEffect(() => {
    if (hasProfile) fetchMatches();
  }, [sport, radius, hasProfile, fetchMatches]);

  if (hasProfile === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#FF4500] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-white tracking-wider">FIND PARTNERS</h1>
          <p className="text-[#888888] text-sm mt-1">
            {matches.length} athletes matching your profile
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters((f) => !f)}
          >
            <Filter className="w-4 h-4" />
            Filters
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={fetchMatches} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mb-4 p-4 bg-[#111111] border border-[#2A2A2A] animate-slide-up">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#888888] uppercase tracking-wider">Radius:</span>
              <div className="flex items-center gap-1">
                {RADIUS_OPTIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRadius(r)}
                    className="px-2 py-1 text-xs border transition-all"
                    style={
                      radius === r
                        ? { background: '#FF4500', color: 'white', borderColor: '#FF4500' }
                        : { background: 'transparent', color: '#888888', borderColor: '#2A2A2A' }
                    }
                  >
                    {r}km
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sport filter */}
      <div className="mb-6">
        <SportFilter selected={sport} onChange={setSport} />
      </div>

      {/* Match grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 skeleton" />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Users className="w-12 h-12 text-[#2A2A2A]" />
          <h3 className="font-display text-xl text-[#888888]">NO MATCHES FOUND</h3>
          <p className="text-[#888888] text-sm text-center max-w-sm">
            Try expanding your search radius or selecting different sports. Complete your profile to improve matching.
          </p>
          <Button onClick={() => { setSport('all'); setRadius(100); }}>
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {matches.map((match) => (
            <AthleteCard
              key={match.user.clerkId}
              id={match.user.clerkId}
              username={match.user.username}
              avatarUrl={match.user.avatarUrl}
              bio={match.user.bio}
              sportTypes={match.user.sportTypes}
              pacePerKm={match.user.pacePerKm}
              weeklyKm={match.user.weeklyKm}
              city={match.user.city}
              score={match.score}
              distanceKm={match.distanceKm}
            />
          ))}
        </div>
      )}
    </div>
  );
}
