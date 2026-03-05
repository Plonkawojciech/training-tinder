'use client';

import { useEffect, useState, useCallback } from 'react';
import { Radio, Clock, MessageSquare, Users, Dumbbell } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { SpotterRequest } from '@/components/gym/spotter-request';
import { formatRelativeTime } from '@/lib/utils';

interface CheckinUser {
  checkin: {
    id: number;
    userId: string;
    gymName: string;
    gymPlaceId: string | null;
    workoutType: string | null;
    checkedInAt: string | null;
  };
  user: {
    clerkId: string;
    username: string | null;
    avatarUrl: string | null;
    sportTypes: string[];
  } | null;
}

interface SpotterEntry {
  request: {
    id: number;
    requesterId: string;
    exercise: string;
    weightKg: number | null;
    gymName: string;
    message: string | null;
    status: string;
    createdAt: string | null;
    expiresAt: string | null;
  };
  requester: {
    clerkId: string;
    username: string | null;
    avatarUrl: string | null;
  } | null;
}

interface LiveData {
  myCheckin: {
    id: number;
    userId: string;
    gymName: string;
    gymPlaceId: string | null;
    workoutType: string | null;
  } | null;
  checkins: CheckinUser[];
}

function elapsedTime(date: string | null): string {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  return hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`;
}

export default function GymLivePage() {
  const [data, setData] = useState<LiveData | null>(null);
  const [spotters, setSpotters] = useState<SpotterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    const [checkinRes, spotterRes] = await Promise.all([
      fetch('/api/checkin'),
      fetch('/api/spotter'),
    ]);

    if (checkinRes.ok) setData(await checkinRes.json());
    if (spotterRes.ok) setSpotters(await spotterRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  async function acceptSpotter(id: number) {
    setAcceptingId(id);
    await fetch('/api/spotter', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'accept' }),
    });
    await loadData();
    setAcceptingId(null);
  }

  const myCheckin = data?.myCheckin;
  const allCheckins = data?.checkins ?? [];
  const otherCheckins = allCheckins.filter((c) => c.checkin.userId !== myCheckin?.userId);

  // Group by gym for the map view
  const gymGroups = allCheckins.reduce<Record<string, CheckinUser[]>>((acc, c) => {
    const key = c.checkin.gymName;
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse" />
            <span className="font-display text-xs text-green-400 tracking-wider">LIVE NOW</span>
          </div>
          <h1 className="font-display text-3xl text-white tracking-wider">WHO&apos;S AT THE GYM</h1>
        </div>
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-green-400" />
          <span className="text-xs text-[#888888]">Auto-refreshes every 30s</span>
        </div>
      </div>

      {/* My status */}
      {myCheckin && (
        <div className="bg-[#111111] border border-[#FF4500]/30 p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-[#FF4500] rounded-full animate-pulse" />
            <p className="text-white text-sm">
              You are checked in at <span className="text-[#FF4500] font-semibold">{myCheckin.gymName}</span>
              {myCheckin.workoutType && (
                <span className="text-[#888888]"> — {myCheckin.workoutType}</span>
              )}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Active checkins */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Gym breakdown */}
          {!loading && Object.keys(gymGroups).length > 0 && (
            <div>
              <h2 className="font-display text-sm text-[#888888] tracking-wider mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#FF4500]" />
                ACTIVE GYMS ({Object.keys(gymGroups).length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(gymGroups).map(([gym, users]) => (
                  <div key={gym} className="bg-[#111111] border border-[#2A2A2A] p-3 flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-semibold truncate">{gym}</p>
                      <p className="text-xs text-[#888888]">{users.length} athlete{users.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex -space-x-1">
                      {users.slice(0, 3).map((u) => (
                        u.user?.avatarUrl ? (
                          <Image
                            key={u.checkin.id}
                            src={u.user.avatarUrl}
                            alt=""
                            width={24}
                            height={24}
                            className="w-6 h-6 object-cover border border-[#111111]"
                          />
                        ) : (
                          <div
                            key={u.checkin.id}
                            className="w-6 h-6 bg-[#2A2A2A] flex items-center justify-center text-[10px] text-white border border-[#111111]"
                          >
                            {(u.user?.username ?? 'U')[0].toUpperCase()}
                          </div>
                        )
                      ))}
                      {users.length > 3 && (
                        <div className="w-6 h-6 bg-[#FF4500] flex items-center justify-center text-[10px] text-white border border-[#111111]">
                          +{users.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All active checkins */}
          <div>
            <h2 className="font-display text-sm text-[#888888] tracking-wider mb-3 flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-[#FF4500]" />
              ALL ACTIVE CHECK-INS ({allCheckins.length})
            </h2>

            {loading ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 skeleton" />
                ))}
              </div>
            ) : allCheckins.length === 0 ? (
              <div className="bg-[#111111] border border-[#2A2A2A] p-8 text-center">
                <Users className="w-10 h-10 text-[#2A2A2A] mx-auto mb-3" />
                <p className="text-[#888888] text-sm">No one is checked in right now</p>
                <p className="text-xs text-[#555555] mt-1">Be the first to check in!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {allCheckins.map((item) => (
                  <div key={item.checkin.id} className="bg-[#111111] border border-[#2A2A2A] p-4 flex items-center gap-3">
                    {item.user?.avatarUrl ? (
                      <Image
                        src={item.user.avatarUrl}
                        alt={item.user.username ?? ''}
                        width={40}
                        height={40}
                        className="w-10 h-10 object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-[#2A2A2A] flex items-center justify-center text-sm text-white shrink-0">
                        {(item.user?.username ?? 'U')[0].toUpperCase()}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white text-sm font-semibold">{item.user?.username ?? 'Unknown'}</span>
                        {item.checkin.workoutType && (
                          <span className="text-[10px] text-[#FF4500] border border-[#FF4500]/30 px-1.5 py-0.5">
                            {item.checkin.workoutType}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-[#888888] truncate">{item.checkin.gymName}</span>
                        {item.checkin.checkedInAt && (
                          <div className="flex items-center gap-1 shrink-0">
                            <Clock className="w-3 h-3 text-[#555555]" />
                            <span className="text-xs text-[#555555]">{elapsedTime(item.checkin.checkedInAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {item.user?.clerkId && item.checkin.userId !== myCheckin?.userId && (
                      <Link
                        href={`/messages?userId=${item.user.clerkId}`}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-[#2A2A2A] text-[#888888] hover:text-white hover:border-[#00D4FF] text-xs font-semibold uppercase tracking-wider transition-all"
                      >
                        <MessageSquare className="w-3 h-3" />
                        Message
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Spotter requests feed */}
          {spotters.length > 0 && (
            <div>
              <h2 className="font-display text-sm text-[#888888] tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse inline-block" />
                OPEN SPOTTER REQUESTS ({spotters.length})
              </h2>
              <div className="flex flex-col gap-3">
                {spotters.map((s) => (
                  <div key={s.request.id} className="bg-[#111111] border border-red-900/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1">
                        {s.requester?.avatarUrl ? (
                          <Image
                            src={s.requester.avatarUrl}
                            alt=""
                            width={32}
                            height={32}
                            className="w-8 h-8 object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-[#2A2A2A] flex items-center justify-center text-xs text-white shrink-0">
                            {(s.requester?.username ?? 'U')[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-white text-sm font-semibold">{s.requester?.username ?? 'Unknown'}</p>
                          <p className="text-xs text-[#888888]">{s.request.gymName}</p>
                        </div>
                      </div>
                      {s.request.createdAt && (
                        <span className="text-xs text-[#555555] shrink-0">{formatRelativeTime(s.request.createdAt)}</span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-3 flex-wrap">
                      <span className="text-sm text-white font-semibold">{s.request.exercise}</span>
                      {s.request.weightKg && (
                        <span className="text-xs text-[#FF4500] border border-[#FF4500]/30 px-2 py-0.5">
                          {s.request.weightKg} kg
                        </span>
                      )}
                    </div>

                    {s.request.message && (
                      <p className="text-xs text-[#888888] mt-2 italic">&ldquo;{s.request.message}&rdquo;</p>
                    )}

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => acceptSpotter(s.request.id)}
                        disabled={acceptingId === s.request.id}
                        className="flex-1 py-2 bg-red-600 text-white text-xs font-semibold uppercase tracking-wider hover:bg-red-700 disabled:opacity-50 transition-all"
                      >
                        {acceptingId === s.request.id ? 'Accepting...' : "I'll Help!"}
                      </button>
                      {s.requester?.clerkId && (
                        <Link
                          href={`/messages?userId=${s.requester.clerkId}`}
                          className="px-4 py-2 border border-[#2A2A2A] text-[#888888] hover:text-white hover:border-[#00D4FF] text-xs font-semibold uppercase tracking-wider transition-all"
                        >
                          Message
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="flex flex-col gap-4">
          {/* Spotter request button */}
          {myCheckin && (
            <div className="bg-[#111111] border border-[#2A2A2A] p-4">
              <h3 className="font-display text-sm text-[#888888] tracking-wider mb-3">NEED HELP?</h3>
              <SpotterRequest gymName={myCheckin.gymName} gymPlaceId={myCheckin.gymPlaceId} />
            </div>
          )}

          {/* Stats */}
          <div className="bg-[#111111] border border-[#2A2A2A] p-4">
            <h3 className="font-display text-sm text-[#888888] tracking-wider mb-3">LIVE STATS</h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#888888]">Athletes training</span>
                <span className="font-display text-lg text-white">{allCheckins.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#888888]">Active gyms</span>
                <span className="font-display text-lg text-white">{Object.keys(gymGroups).length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#888888]">Spotter requests</span>
                <span className="font-display text-lg text-[#FF4500]">{spotters.length}</span>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="bg-[#111111] border border-[#2A2A2A] p-4">
            <h3 className="font-display text-sm text-[#888888] tracking-wider mb-3">QUICK LINKS</h3>
            <div className="flex flex-col gap-2">
              <Link
                href="/gym"
                className="flex items-center justify-between p-2.5 border border-[#2A2A2A] hover:border-[#FF4500] text-sm text-[#888888] hover:text-white transition-all"
              >
                <span>Gym Hub</span>
                <Dumbbell className="w-4 h-4" />
              </Link>
              <Link
                href="/gym/finder"
                className="flex items-center justify-between p-2.5 border border-[#2A2A2A] hover:border-[#FF4500] text-sm text-[#888888] hover:text-white transition-all"
              >
                <span>Find Gyms</span>
                <span className="text-xs">📍</span>
              </Link>
              <Link
                href="/discover"
                className="flex items-center justify-between p-2.5 border border-[#2A2A2A] hover:border-[#FF4500] text-sm text-[#888888] hover:text-white transition-all"
              >
                <span>Find Partners</span>
                <span className="text-xs">🤝</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
