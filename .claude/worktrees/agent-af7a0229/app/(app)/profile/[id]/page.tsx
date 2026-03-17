'use client';

export const dynamic = 'force-dynamic';

import nextDynamic from 'next/dynamic';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MessageSquare, Zap, Route, MapPin } from 'lucide-react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getSportLabel, formatPaceMin, getMatchScoreColor } from '@/lib/utils';
import { useSafeUser } from '@/lib/auth';

interface UserProfile {
  id: number;
  clerkId: string;
  username: string | null;
  bio: string | null;
  avatarUrl: string | null;
  sportTypes: string[];
  pacePerKm: number | null;
  weeklyKm: number | null;
  city: string | null;
}

interface MatchData {
  score: number;
  distanceKm: number | null;
}

function UserProfilePageInner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const user = useSafeUser();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    if (user.id && id === user.id) {
      router.replace('/profile');
      return;
    }

    async function fetchData() {
      try {
        const [profileRes, matchRes] = await Promise.all([
          fetch(`/api/users/${id}`),
          fetch(`/api/matches?radius=500`),
        ]);

        if (profileRes.ok) {
          const data: UserProfile = await profileRes.json();
          setProfile(data);
        }

        if (matchRes.ok) {
          const matches: Array<{ user: { clerkId: string }; score: number; distanceKm: number | null }> = await matchRes.json();
          const myMatch = matches.find((m) => m.user.clerkId === id);
          if (myMatch) {
            setMatchData({ score: myMatch.score, distanceKm: myMatch.distanceKm });
          }
        }
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user.id, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 text-center">
        <p className="text-[#888888]">Athlete not found.</p>
        <Link href="/dashboard">
          <Button variant="outline" className="mt-4">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const scoreColor = matchData ? getMatchScoreColor(matchData.score) : '#888888';

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-[#888888] hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Profile card */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] p-6 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-6">
            <Avatar
              src={profile.avatarUrl}
              fallback={profile.username ?? '?'}
              size="xl"
            />
            <div>
              <h1 className="font-display text-3xl text-white tracking-wider">
                {profile.username ?? 'Athlete'}
              </h1>
              {profile.city && (
                <div className="flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3 text-[#888888]" />
                  <span className="text-sm text-[#888888]">{profile.city}</span>
                  {matchData?.distanceKm !== null && matchData?.distanceKm !== undefined && (
                    <span className="text-sm text-[#888888]">
                      · {matchData.distanceKm < 1 ? '<1' : Math.round(matchData.distanceKm)}km away
                    </span>
                  )}
                </div>
              )}

              {/* Match score */}
              {matchData && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="font-display text-3xl leading-none" style={{ color: scoreColor }}>
                    {matchData.score}%
                  </span>
                  <span className="text-xs text-[#888888] uppercase tracking-wider">match</span>
                </div>
              )}
            </div>
          </div>

          <Link href={`/messages?partner=${profile.clerkId}`} onClick={() => {}}>
            <Button size="sm">
              <MessageSquare className="w-4 h-4" />
              Message
            </Button>
          </Link>
        </div>

        {profile.bio && (
          <p className="mt-4 text-[#888888] text-sm leading-relaxed">{profile.bio}</p>
        )}
      </div>

      {/* Sports */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] p-6 mb-4">
        <h3 className="font-display text-sm text-[#888888] tracking-wider mb-4">SPORTS</h3>
        <div className="flex flex-wrap gap-2">
          {profile.sportTypes.map((sport) => (
            <Badge key={sport} sport={sport} className="px-3 py-1">
              {getSportLabel(sport)}
            </Badge>
          ))}
          {profile.sportTypes.length === 0 && (
            <p className="text-[#888888] text-sm">No sports listed</p>
          )}
        </div>
      </div>

      {/* Performance stats */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] p-6">
        <h3 className="font-display text-sm text-[#888888] tracking-wider mb-4">PERFORMANCE</h3>
        <div className="grid grid-cols-2 gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[rgba(124,58,237,0.1)] border border-[rgba(124,58,237,0.2)] flex items-center justify-center">
              <Zap className="w-5 h-5 text-[#7C3AED]" />
            </div>
            <div>
              <p className="font-display text-xl text-white">
                {profile.pacePerKm ? formatPaceMin(profile.pacePerKm) : '--:--'}
              </p>
              <p className="text-xs text-[#888888]">min/km pace</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[rgba(124,58,237,0.1)] border border-[rgba(124,58,237,0.2)] flex items-center justify-center">
              <Route className="w-5 h-5 text-[#7C3AED]" />
            </div>
            <div>
              <p className="font-display text-xl text-white">{profile.weeklyKm ?? '--'}</p>
              <p className="text-xs text-[#888888]">km/week</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default nextDynamic(() => Promise.resolve({ default: UserProfilePageInner }), { ssr: false });
