'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Filter, RefreshCw, Users, Dumbbell, Plus, ChevronRight } from 'lucide-react';
import { AthleteCard } from '@/components/athletes/athlete-card';
import { SportFilter } from '@/components/athletes/sport-filter';
import { WorkoutCard } from '@/components/gym/workout-card';
import { ActivityCard } from '@/components/feed/activity-card';
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

interface WorkoutLog {
  id: number;
  name: string;
  type: string;
  durationMin: number | null;
  date: string;
  exercises: { id: number }[];
  creator: { username: string | null; avatarUrl: string | null } | null;
}

interface FeedItem {
  id: number;
  userId: string;
  type: string;
  dataJson: Record<string, unknown>;
  createdAt: string;
  creator: { username: string | null; avatarUrl: string | null; clerkId: string } | null;
  isOwn: boolean;
  isFollowing: boolean;
}

const RADIUS_OPTIONS = [5, 10, 25, 50, 100];
type ActiveTab = 'partners' | 'gym';

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>('partners');
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [recentWorkouts, setRecentWorkouts] = useState<WorkoutLog[]>([]);
  const [feedPreview, setFeedPreview] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [gymLoading, setGymLoading] = useState(false);
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

  const fetchGymData = useCallback(async () => {
    setGymLoading(true);
    try {
      const [workoutsRes, feedRes] = await Promise.all([
        fetch('/api/workouts?mine=true&limit=4'),
        fetch('/api/feed?limit=5'),
      ]);
      if (workoutsRes.ok) setRecentWorkouts(await workoutsRes.json());
      if (feedRes.ok) setFeedPreview(await feedRes.json());
    } finally {
      setGymLoading(false);
    }
  }, []);

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
        fetchGymData();
      }
    }
    checkProfile();
  }, [router, fetchMatches, fetchGymData]);

  useEffect(() => {
    if (hasProfile) fetchMatches();
  }, [sport, radius, hasProfile, fetchMatches]);

  function handleFeedFollowToggle(targetId: string, following: boolean) {
    setFeedPreview((prev) =>
      prev.map((item) =>
        item.creator?.clerkId === targetId ? { ...item, isFollowing: following } : item
      )
    );
  }

  if (hasProfile === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#FF4500] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Quick actions bar */}
      <div className="flex items-center gap-3 mb-6 p-3 bg-[#111111] border border-[#2A2A2A]">
        <Link href="/gym/log">
          <Button size="sm">
            <Dumbbell className="w-4 h-4" />
            Log Workout
          </Button>
        </Link>
        <Link href="/sessions/new">
          <Button variant="outline" size="sm">
            <Plus className="w-4 h-4" />
            New Session
          </Button>
        </Link>
        <span className="text-xs text-[#555555] ml-auto hidden sm:inline">
          Find partners · Track progress · Connect
        </span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#2A2A2A] mb-6">
        <button
          onClick={() => setActiveTab('partners')}
          className="px-4 py-2.5 text-sm font-medium uppercase tracking-wider border-b-2 transition-all"
          style={
            activeTab === 'partners'
              ? { borderColor: '#FF4500', color: '#FF4500' }
              : { borderColor: 'transparent', color: '#888888' }
          }
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Find Partners
          </div>
        </button>
        <button
          onClick={() => setActiveTab('gym')}
          className="px-4 py-2.5 text-sm font-medium uppercase tracking-wider border-b-2 transition-all"
          style={
            activeTab === 'gym'
              ? { borderColor: '#FF4500', color: '#FF4500' }
              : { borderColor: 'transparent', color: '#888888' }
          }
        >
          <div className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4" />
            Gym Partners
          </div>
        </button>
      </div>

      {activeTab === 'partners' && (
        <>
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
                Try expanding your search radius or selecting different sports.
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
        </>
      )}

      {activeTab === 'gym' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-display text-3xl text-white tracking-wider">GYM PARTNERS</h1>
              <p className="text-[#888888] text-sm mt-1">Athletes with similar training styles</p>
            </div>
            <Link href="/gym">
              <Button variant="outline" size="sm">
                Gym Hub <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>

          {gymLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 skeleton" />
              ))}
            </div>
          ) : (
            <>
              {/* Recent workouts */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display text-sm text-[#888888] tracking-wider">YOUR RECENT WORKOUTS</h2>
                  <Link href="/gym" className="text-xs text-[#FF4500] hover:text-[#FF6633] flex items-center gap-1">
                    View all <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                {recentWorkouts.length === 0 ? (
                  <div className="bg-[#111111] border border-[#2A2A2A] p-6 text-center">
                    <Dumbbell className="w-8 h-8 text-[#2A2A2A] mx-auto mb-2" />
                    <p className="text-[#888888] text-sm mb-3">No workouts logged yet</p>
                    <Link href="/gym/log">
                      <Button size="sm">
                        <Plus className="w-4 h-4" />
                        Log First Workout
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {recentWorkouts.map((w) => (
                      <WorkoutCard
                        key={w.id}
                        id={w.id}
                        name={w.name}
                        type={w.type}
                        durationMin={w.durationMin}
                        exerciseCount={w.exercises?.length ?? 0}
                        date={w.date}
                        creator={w.creator}
                        isOwn
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Activity feed preview */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display text-sm text-[#888888] tracking-wider">ACTIVITY FEED</h2>
                  <Link href="/feed" className="text-xs text-[#FF4500] hover:text-[#FF6633] flex items-center gap-1">
                    Full feed <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                {feedPreview.length === 0 ? (
                  <div className="bg-[#111111] border border-[#2A2A2A] p-6 text-center">
                    <p className="text-[#888888] text-sm">No activity yet. Follow athletes to see their updates!</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {feedPreview.slice(0, 3).map((item) => (
                      <ActivityCard
                        key={item.id}
                        id={item.id}
                        type={item.type}
                        dataJson={item.dataJson}
                        createdAt={item.createdAt}
                        creator={item.creator}
                        isOwn={item.isOwn}
                        isFollowing={item.isFollowing}
                        onFollowToggle={handleFeedFollowToggle}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
