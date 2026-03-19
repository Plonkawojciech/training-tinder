'use client';

export const dynamic = 'force-dynamic';

import nextDynamic from 'next/dynamic';
import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MessageSquare, Zap, Route, MapPin, UserPlus, Check } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getSportLabel, formatPaceMin, getMatchScoreColor } from '@/lib/utils';
import { useSafeUser } from '@/lib/auth';
import { useLang } from '@/lib/lang';

interface UserProfile {
  id: number;
  authEmail: string;
  username: string | null;
  bio: string | null;
  avatarUrl: string | null;
  sportTypes: string[];
  pacePerKm: number | null;
  weeklyKm: number | null;
  city: string | null;
  photos?: string[];
  stravaVerified?: boolean;
}

interface MatchData {
  score: number;
  distanceKm: number | null;
}

function UserProfilePageInner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const user = useSafeUser();
  const router = useRouter();
  const { t } = useLang();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [friendStatus, setFriendStatus] = useState<'none' | 'sent' | 'friends'>('none');
  const [friendLoading, setFriendLoading] = useState(false);

  const checkFriendStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/friends');
      if (res.ok) {
        const data = await res.json();
        const friends: Array<{ id: number; authEmail: string; status: string }> = data.friends || data || [];
        const pending: Array<{ id: number; receiverAuthEmail?: string; senderAuthEmail?: string }> = data.pending || [];
        if (friends.some((f) => f.authEmail === id)) {
          setFriendStatus('friends');
        } else if (pending.some((p) => p.receiverAuthEmail === id || p.senderAuthEmail === id)) {
          setFriendStatus('sent');
        }
      }
    } catch { /* ignore */ }
  }, [id]);

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
          const matches: Array<{ user: { authEmail: string }; score: number; distanceKm: number | null }> = await matchRes.json();
          const myMatch = matches.find((m) => m.user.authEmail === id);
          if (myMatch) {
            setMatchData({ score: myMatch.score, distanceKm: myMatch.distanceKm });
          }
        }
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    checkFriendStatus();
  }, [id, user.id, router, checkFriendStatus]);

  async function handleAddFriend() {
    if (friendLoading || friendStatus !== 'none') return;
    setFriendLoading(true);
    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetAuthEmail: id }),
      });
      if (res.ok) setFriendStatus('sent');
    } finally {
      setFriendLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 text-center">
        <p style={{ color: 'var(--text-muted)' }}>{t('gen_not_found')}</p>
        <Link href="/dashboard">
          <Button variant="outline" className="mt-4">{t('nav_dashboard')}</Button>
        </Link>
      </div>
    );
  }

  const scoreColor = matchData ? getMatchScoreColor(matchData.score) : 'var(--text-muted)';

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm mb-6 transition-colors"
        style={{ color: 'var(--text-muted)' }}
      >
        <ArrowLeft className="w-4 h-4" />
        {t('forum_back')}
      </button>

      {/* Profile card */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} className="p-6 rounded-xl mb-4">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="flex items-start gap-4 sm:gap-6 flex-1 min-w-0">
            <Avatar
              src={profile.avatarUrl}
              fallback={profile.username ?? '?'}
              size="xl"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl sm:text-3xl tracking-wider" style={{ color: 'var(--text)' }}>
                  {profile.username ?? t('gen_athlete')}
                </h1>
                {profile.stravaVerified && (
                  <span title="Strava verified" className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#FC4C02] text-white text-xs">✓</span>
                )}
              </div>
              {profile.city && (
                <div className="flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{profile.city}</span>
                  {matchData?.distanceKm !== null && matchData?.distanceKm !== undefined && (
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      · {matchData.distanceKm < 1 ? '<1' : Math.round(matchData.distanceKm)}km
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
                  <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>match</span>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 w-full sm:w-auto">
            <Link href={`/messages?partner=${profile.authEmail}&name=${encodeURIComponent(profile.username ?? '')}`} className="flex-1 sm:flex-none">
              <Button size="sm" className="w-full sm:w-auto">
                <MessageSquare className="w-4 h-4 mr-1" />
                {t('prof_message')}
              </Button>
            </Link>
            <button
              onClick={handleAddFriend}
              disabled={friendStatus !== 'none' || friendLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex-1 sm:flex-none justify-center"
              style={{
                background: friendStatus === 'friends' ? 'rgba(34,197,94,0.15)' : friendStatus === 'sent' ? 'var(--bg-elevated)' : 'rgba(99,102,241,0.15)',
                color: friendStatus === 'friends' ? '#22C55E' : friendStatus === 'sent' ? 'var(--text-muted)' : '#6366F1',
                border: '1px solid',
                borderColor: friendStatus === 'friends' ? 'rgba(34,197,94,0.3)' : friendStatus === 'sent' ? 'var(--border)' : 'rgba(99,102,241,0.3)',
                opacity: friendLoading ? 0.6 : 1,
              }}
            >
              {friendStatus === 'friends' ? <Check className="w-4 h-4" /> : friendStatus === 'sent' ? <Check className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {friendStatus === 'friends' ? t('nav_friends') : friendStatus === 'sent' ? t('prof_friend_sent') : t('prof_add_friend')}
            </button>
          </div>
        </div>

        {profile.bio && (
          <p className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{profile.bio}</p>
        )}
      </div>

      {/* Photo gallery */}
      {profile.photos && profile.photos.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} className="p-6 rounded-xl mb-4">
          <h3 className="font-display text-sm tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
            {t('prof_gallery')}
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollSnapType: 'x mandatory' }}>
            {profile.photos.map((url, i) => (
              <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden shrink-0" style={{ scrollSnapAlign: 'start' }}>
                <Image src={url} alt={`${t('prof_gallery')} ${i + 1}`} fill className="object-cover" sizes="96px" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sports */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} className="p-6 rounded-xl mb-4">
        <h3 className="font-display text-sm tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
          SPORTS
        </h3>
        <div className="flex flex-wrap gap-2">
          {profile.sportTypes.map((sport) => (
            <Badge key={sport} sport={sport} className="px-3 py-1">
              {getSportLabel(sport)}
            </Badge>
          ))}
          {profile.sportTypes.length === 0 && (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('gen_none')}</p>
          )}
        </div>
      </div>

      {/* Performance stats */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} className="p-6 rounded-xl">
        <h3 className="font-display text-sm tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
          {t('stats_title')}
        </h3>
        <div className="grid grid-cols-2 gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[rgba(99,102,241,0.1)] border border-[rgba(99,102,241,0.2)] flex items-center justify-center rounded-lg">
              <Zap className="w-5 h-5 text-[#6366F1]" />
            </div>
            <div>
              <p className="font-display text-xl" style={{ color: 'var(--text)' }}>
                {profile.pacePerKm ? formatPaceMin(profile.pacePerKm) : '--:--'}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>min/km</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[rgba(99,102,241,0.1)] border border-[rgba(99,102,241,0.2)] flex items-center justify-center rounded-lg">
              <Route className="w-5 h-5 text-[#6366F1]" />
            </div>
            <div>
              <p className="font-display text-xl" style={{ color: 'var(--text)' }}>{profile.weeklyKm ?? '--'}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>km/{t('lb_week')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default nextDynamic(() => Promise.resolve({ default: UserProfilePageInner }), { ssr: false });
