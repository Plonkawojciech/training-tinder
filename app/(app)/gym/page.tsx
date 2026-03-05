'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Dumbbell, Trophy, Flame, Plus, ChevronRight, TrendingUp, Users, MapPin, Radio } from 'lucide-react';
import { WorkoutCard } from '@/components/gym/workout-card';
import { PlanCard } from '@/components/gym/plan-card';
import { Big4Display } from '@/components/gym/big4-display';
import { CheckinWidget } from '@/components/gym/checkin-widget';
import { SpotterRequest } from '@/components/gym/spotter-request';
import { Button } from '@/components/ui/button';

interface StatsSummary {
  totalWorkouts: number;
  weekWorkouts: number;
  monthWorkouts: number;
  monthPRs: number;
  totalSets: number;
  totalPRs: number;
}

interface WorkoutLog {
  id: number;
  name: string;
  type: string;
  durationMin: number | null;
  date: string;
  isPublic: boolean;
  exercises: { id: number }[];
  creator: { username: string | null; avatarUrl: string | null } | null;
}

interface PRRecord {
  exerciseName: string;
  weightKg: number;
  reps: number;
}

interface Plan {
  id: number;
  title: string;
  description: string | null;
  sportType: string;
  difficulty: string;
  durationWeeks: number;
  creator: { username: string | null; avatarUrl: string | null } | null;
}

interface UserProfile {
  gymName: string | null;
  clerkId: string;
}

interface ActiveCheckin {
  checkin: {
    id: number;
    userId: string;
    gymName: string;
    gymPlaceId: string | null;
    workoutType: string | null;
    checkedInAt: string | null;
  };
  user: { clerkId: string; username: string | null; avatarUrl: string | null; sportTypes: string[] } | null;
}

interface SpotterEntry {
  request: {
    id: number;
    exercise: string;
    weightKg: number | null;
    gymName: string;
    message: string | null;
    status: string;
    createdAt: string | null;
    expiresAt: string | null;
  };
  requester: { clerkId: string; username: string | null; avatarUrl: string | null } | null;
}

export default function GymHubPage() {
  const router = useRouter();
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [recentWorkouts, setRecentWorkouts] = useState<WorkoutLog[]>([]);
  const [prs, setPrs] = useState<PRRecord[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [gymCheckins, setGymCheckins] = useState<ActiveCheckin[]>([]);
  const [gymSpotters, setGymSpotters] = useState<SpotterEntry[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, workoutsRes, prsRes, plansRes, profileRes] = await Promise.all([
          fetch('/api/stats?type=summary'),
          fetch('/api/workouts?mine=true&limit=6'),
          fetch('/api/records'),
          fetch('/api/plans?limit=4'),
          fetch('/api/users/profile'),
        ]);

        if (statsRes.ok) setStats(await statsRes.json());
        if (workoutsRes.ok) setRecentWorkouts(await workoutsRes.json());
        if (prsRes.ok) {
          const data = await prsRes.json() as { best: PRRecord[] };
          setPrs(data.best ?? []);
        }
        if (plansRes.ok) setPlans((await plansRes.json()).slice(0, 4));

        let userProfile: UserProfile | null = null;
        if (profileRes.ok) {
          userProfile = await profileRes.json() as UserProfile;
          setProfile(userProfile);
        }

        if (userProfile?.gymName) {
          const [checkinRes, spotterRes] = await Promise.all([
            fetch(`/api/checkin?gymName=${encodeURIComponent(userProfile.gymName)}`),
            fetch(`/api/spotter?gymName=${encodeURIComponent(userProfile.gymName)}`),
          ]);
          if (checkinRes.ok) {
            const d = await checkinRes.json() as { myCheckin: unknown; checkins: ActiveCheckin[] };
            setGymCheckins(d.checkins ?? []);
          }
          if (spotterRes.ok) setGymSpotters(await spotterRes.json());
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-white tracking-wider">GYM HUB</h1>
          <p className="text-[#888888] text-sm mt-1">Your strength training command center</p>
        </div>
        <Link href="/gym/log">
          <Button>
            <Plus className="w-4 h-4" />
            Log Workout
          </Button>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-[#111111] border border-[#2A2A2A] p-4 text-center">
          <div className="w-8 h-8 bg-[rgba(255,69,0,0.1)] border border-[rgba(255,69,0,0.2)] flex items-center justify-center mx-auto mb-2">
            <Dumbbell className="w-4 h-4 text-[#FF4500]" />
          </div>
          {loading ? (
            <div className="h-7 skeleton mb-1" />
          ) : (
            <p className="font-display text-2xl text-white">{stats?.weekWorkouts ?? 0}</p>
          )}
          <p className="text-[10px] text-[#888888] uppercase tracking-wider">Workouts this week</p>
        </div>
        <div className="bg-[#111111] border border-[#2A2A2A] p-4 text-center">
          <div className="w-8 h-8 bg-[rgba(255,215,0,0.1)] border border-[rgba(255,215,0,0.2)] flex items-center justify-center mx-auto mb-2">
            <Trophy className="w-4 h-4 text-[#FFD700]" />
          </div>
          {loading ? (
            <div className="h-7 skeleton mb-1" />
          ) : (
            <p className="font-display text-2xl text-white">{stats?.monthPRs ?? 0}</p>
          )}
          <p className="text-[10px] text-[#888888] uppercase tracking-wider">PRs this month</p>
        </div>
        <div className="bg-[#111111] border border-[#2A2A2A] p-4 text-center">
          <div className="w-8 h-8 bg-[rgba(255,136,0,0.1)] border border-[rgba(255,136,0,0.2)] flex items-center justify-center mx-auto mb-2">
            <Flame className="w-4 h-4 text-[#FF8800]" />
          </div>
          {loading ? (
            <div className="h-7 skeleton mb-1" />
          ) : (
            <p className="font-display text-2xl text-white">{stats?.totalSets ?? 0}</p>
          )}
          <p className="text-[10px] text-[#888888] uppercase tracking-wider">Sets this month</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Recent Workouts */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-sm text-[#888888] tracking-wider">RECENT WORKOUTS</h2>
              <Link href="/gym/log" className="text-xs text-[#FF4500] hover:text-[#FF6633] flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-32 skeleton" />
                ))}
              </div>
            ) : recentWorkouts.length === 0 ? (
              <div className="bg-[#111111] border border-[#2A2A2A] p-8 text-center">
                <Dumbbell className="w-10 h-10 text-[#2A2A2A] mx-auto mb-3" />
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
                    onClick={() => router.push(`/gym/log?view=${w.id}`)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Featured Plans */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-sm text-[#888888] tracking-wider">FEATURED PLANS</h2>
              <Link href="/gym/plans" className="text-xs text-[#FF4500] hover:text-[#FF6633] flex items-center gap-1">
                Browse all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-28 skeleton" />
                ))}
              </div>
            ) : plans.length === 0 ? (
              <div className="bg-[#111111] border border-[#2A2A2A] p-6 text-center">
                <p className="text-[#888888] text-sm">No public plans yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {plans.map((plan) => (
                  <PlanCard key={plan.id} {...plan} />
                ))}
              </div>
            )}
          </div>

          {/* Who's training at your gym */}
          {profile?.gymName && !loading && gymCheckins.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-sm text-[#888888] tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse inline-block" />
                  WHO&apos;S TRAINING NOW
                </h2>
                <Link href="/gym/live" className="text-xs text-[#FF4500] hover:text-[#FF6633] flex items-center gap-1">
                  View all <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {gymCheckins.slice(0, 4).map((item) => (
                  <div key={item.checkin.id} className="bg-[#111111] border border-[#2A2A2A] p-3 flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#2A2A2A] flex items-center justify-center text-xs text-white shrink-0">
                      {(item.user?.username ?? 'U')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{item.user?.username ?? 'Unknown'}</p>
                      {item.checkin.workoutType && (
                        <span className="text-[10px] text-[#FF4500] border border-[#FF4500]/30 px-1">{item.checkin.workoutType}</span>
                      )}
                    </div>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Open spotter requests */}
          {profile?.gymName && !loading && gymSpotters.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-sm text-[#888888] tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse inline-block" />
                  OPEN SPOTTER REQUESTS
                </h2>
                <Link href="/gym/live" className="text-xs text-[#FF4500] hover:text-[#FF6633] flex items-center gap-1">
                  View all <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {gymSpotters.slice(0, 2).map((s) => (
                  <div key={s.request.id} className="bg-[#111111] border border-red-900/40 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm font-semibold">{s.request.exercise}</span>
                      {s.request.weightKg && (
                        <span className="text-xs text-[#FF4500] border border-[#FF4500]/30 px-1.5 py-0.5">{s.request.weightKg}kg</span>
                      )}
                    </div>
                    <p className="text-xs text-[#888888]">{s.requester?.username ?? 'Unknown'}</p>
                    {s.request.message && <p className="text-xs text-[#555555] mt-1 italic">&ldquo;{s.request.message}&rdquo;</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Check-in Widget */}
          <CheckinWidget gymName={profile?.gymName} />

          {/* Spotter Request */}
          {profile?.gymName && (
            <div className="bg-[#111111] border border-[#2A2A2A] p-4">
              <h3 className="font-display text-sm text-[#888888] tracking-wider mb-3">NEED HELP?</h3>
              <SpotterRequest gymName={profile.gymName} />
            </div>
          )}

          {/* Big 4 */}
          <Big4Display records={prs} />

          {/* Top lifts */}
          <div className="bg-[#111111] border border-[#2A2A2A] p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-[#FF4500]" />
              <h3 className="font-display text-sm text-[#888888] tracking-wider">TOP LIFTS</h3>
            </div>
            {loading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 skeleton" />
                ))}
              </div>
            ) : prs.length === 0 ? (
              <p className="text-xs text-[#555555]">No PRs recorded yet</p>
            ) : (
              <div className="flex flex-col gap-2">
                {prs.slice(0, 6).map((pr) => (
                  <div key={pr.exerciseName} className="flex items-center justify-between py-1.5 border-b border-[#1A1A1A] last:border-0">
                    <span className="text-xs text-[#888888] truncate">{pr.exerciseName}</span>
                    <span className="text-xs font-bold text-white ml-2 shrink-0">{pr.weightKg}kg</span>
                  </div>
                ))}
              </div>
            )}
            <Link href="/gym/records" className="flex items-center gap-1 text-xs text-[#FF4500] mt-3 hover:text-[#FF6633]">
              All records <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Quick actions */}
          <div className="bg-[#111111] border border-[#2A2A2A] p-4">
            <h3 className="font-display text-sm text-[#888888] tracking-wider mb-3">QUICK ACTIONS</h3>
            <div className="flex flex-col gap-2">
              <Link href="/gym/log" className="flex items-center justify-between p-2.5 border border-[#2A2A2A] hover:border-[#FF4500] transition-all text-sm text-[#888888] hover:text-white">
                <span>Log Workout</span>
                <Dumbbell className="w-4 h-4" />
              </Link>
              <Link href="/gym/records" className="flex items-center justify-between p-2.5 border border-[#2A2A2A] hover:border-[#FF4500] transition-all text-sm text-[#888888] hover:text-white">
                <span>Personal Records</span>
                <Trophy className="w-4 h-4" />
              </Link>
              <Link href="/gym/finder" className="flex items-center justify-between p-2.5 border border-[#2A2A2A] hover:border-[#FF4500] transition-all text-sm text-[#888888] hover:text-white">
                <span>Find Nearby Gym</span>
                <MapPin className="w-4 h-4" />
              </Link>
              <Link href="/gym/live" className="flex items-center justify-between p-2.5 border border-[#2A2A2A] hover:border-[#FF4500] transition-all text-sm text-[#888888] hover:text-white">
                <span>Find Gym Partners</span>
                <Radio className="w-4 h-4" />
              </Link>
              <Link href="/discover" className="flex items-center justify-between p-2.5 border border-[#2A2A2A] hover:border-[#FF4500] transition-all text-sm text-[#888888] hover:text-white">
                <span>Find Athletes</span>
                <Users className="w-4 h-4" />
              </Link>
              <Link href="/gym/plans" className="flex items-center justify-between p-2.5 border border-[#2A2A2A] hover:border-[#FF4500] transition-all text-sm text-[#888888] hover:text-white">
                <span>Training Plans</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
              <Link href="/stats" className="flex items-center justify-between p-2.5 border border-[#2A2A2A] hover:border-[#FF4500] transition-all text-sm text-[#888888] hover:text-white">
                <span>Progress Stats</span>
                <TrendingUp className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
