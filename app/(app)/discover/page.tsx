'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Compass, MapPin } from 'lucide-react';
import { AthleteCard } from '@/components/athletes/athlete-card';
import { SportFilter } from '@/components/athletes/sport-filter';

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

function DiscoverContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') ?? '';

  const [athletes, setAthletes] = useState<MatchResult[]>([]);
  const [filtered, setFiltered] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [sport, setSport] = useState('all');

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        const res = await fetch('/api/matches?radius=500');
        if (res.ok) {
          const data: MatchResult[] = await res.json();
          setAthletes(data);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  useEffect(() => {
    let result = athletes;
    if (sport !== 'all') {
      result = result.filter((a) => a.user.sportTypes.includes(sport));
    }
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (a) =>
          a.user.username?.toLowerCase().includes(q) ||
          a.user.city?.toLowerCase().includes(q) ||
          a.user.bio?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [athletes, sport, query]);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Compass className="w-6 h-6 text-[#FF4500]" />
        <div>
          <h1 className="font-display text-3xl text-white tracking-wider">DISCOVER</h1>
          <p className="text-[#888888] text-sm">
            {query ? `Results for "${query}" — ` : ''}
            {filtered.length} athletes nearby
          </p>
        </div>
      </div>

      {/* Sport filter */}
      <div className="mb-6">
        <SportFilter selected={sport} onChange={setSport} />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-52 skeleton" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <MapPin className="w-12 h-12 text-[#2A2A2A]" />
          <h3 className="font-display text-xl text-[#888888]">NO ATHLETES FOUND</h3>
          <p className="text-[#888888] text-sm text-center">
            {query ? `No athletes match "${query}". Try a different search.` : 'Be the first athlete in your area!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((a) => (
            <AthleteCard
              key={a.user.clerkId}
              id={a.user.clerkId}
              username={a.user.username}
              avatarUrl={a.user.avatarUrl}
              bio={a.user.bio}
              sportTypes={a.user.sportTypes}
              pacePerKm={a.user.pacePerKm}
              weeklyKm={a.user.weeklyKm}
              city={a.user.city}
              score={a.score}
              distanceKm={a.distanceKm}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Compass className="w-6 h-6 text-[#FF4500]" />
          <h1 className="font-display text-3xl text-white tracking-wider">DISCOVER</h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-52 skeleton" />
          ))}
        </div>
      </div>
    }>
      <DiscoverContent />
    </Suspense>
  );
}
