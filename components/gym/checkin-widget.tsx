'use client';

import { useEffect, useState, useCallback } from 'react';
import { MapPin, Clock, LogOut, Users } from 'lucide-react';
import { getSportLabel } from '@/lib/utils';
import Image from 'next/image';

interface CheckinData {
  id: number;
  userId: string;
  gymName: string;
  gymPlaceId: string | null;
  workoutType: string | null;
  checkedInAt: string | null;
}

interface OtherUser {
  checkin: CheckinData;
  user: {
    clerkId: string;
    username: string | null;
    avatarUrl: string | null;
    sportTypes: string[];
  } | null;
}

interface CheckinResponse {
  myCheckin: CheckinData | null;
  checkins: OtherUser[];
}

const WORKOUT_TYPES = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body', 'Cardio', 'Other'];

export function CheckinWidget({ gymName, gymPlaceId }: { gymName?: string | null; gymPlaceId?: string | null }) {
  const [myCheckin, setMyCheckin] = useState<CheckinData | null>(null);
  const [others, setOthers] = useState<OtherUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [elapsed, setElapsed] = useState('');
  const [workoutType, setWorkoutType] = useState('');
  const [showTypeSelect, setShowTypeSelect] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (gymPlaceId) params.set('gymPlaceId', gymPlaceId);
    else if (gymName) params.set('gymName', gymName);

    const res = await fetch(`/api/checkin?${params}`);
    if (res.ok) {
      const data: CheckinResponse = await res.json();
      setMyCheckin(data.myCheckin);
      setOthers(data.checkins.filter((o) => o.checkin.userId !== data.myCheckin?.userId));
    }
    setLoading(false);
  }, [gymName, gymPlaceId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (!myCheckin?.checkedInAt) return;
    const timer = setInterval(() => {
      const diff = Date.now() - new Date(myCheckin.checkedInAt!).getTime();
      const mins = Math.floor(diff / 60000);
      const hrs = Math.floor(mins / 60);
      setElapsed(hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`);
    }, 1000);
    return () => clearInterval(timer);
  }, [myCheckin]);

  async function handleCheckin(type?: string) {
    if (!gymName) return;
    setChecking(true);
    const res = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gymName,
        gymPlaceId: gymPlaceId ?? undefined,
        workoutType: type ?? workoutType ?? undefined,
      }),
    });
    if (res.ok) {
      await load();
    }
    setChecking(false);
    setShowTypeSelect(false);
  }

  async function handleCheckout() {
    setChecking(true);
    await fetch('/api/checkin', { method: 'DELETE' });
    setMyCheckin(null);
    setElapsed('');
    setChecking(false);
  }

  if (!gymName) {
    return (
      <div className="bg-[#111111] border border-[#2A2A2A] p-4">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-4 h-4 text-[#888888]" />
          <h3 className="font-display text-sm text-[#888888] tracking-wider">GYM CHECK-IN</h3>
        </div>
        <p className="text-xs text-[#555555]">Set your home gym to enable check-in</p>
      </div>
    );
  }

  return (
    <div className="bg-[#111111] border border-[#2A2A2A] p-4">
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-4 h-4 text-[#FF4500]" />
        <h3 className="font-display text-sm text-[#888888] tracking-wider">GYM CHECK-IN</h3>
      </div>

      {loading ? (
        <div className="h-12 skeleton" />
      ) : myCheckin ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-white font-semibold">At {myCheckin.gymName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3 h-3 text-[#888888]" />
                <span className="text-xs text-[#888888]">{elapsed || '0m'}</span>
                {myCheckin.workoutType && (
                  <span className="text-xs text-[#FF4500] border border-[#FF4500]/30 px-1.5 py-0.5">
                    {myCheckin.workoutType}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={handleCheckout}
              disabled={checking}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#2A2A2A] text-[#888888] hover:text-red-400 hover:border-red-800 text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-50"
            >
              <LogOut className="w-3 h-3" />
              Check Out
            </button>
          </div>

          {others.length > 0 && (
            <div className="border-t border-[#1A1A1A] pt-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Users className="w-3 h-3 text-[#888888]" />
                <span className="text-xs text-[#888888]">{others.length} other{others.length !== 1 ? 's' : ''} here now</span>
              </div>
              <div className="flex flex-col gap-2">
                {others.slice(0, 5).map((o) => (
                  <div key={o.checkin.id} className="flex items-center gap-2">
                    {o.user?.avatarUrl ? (
                      <Image
                        src={o.user.avatarUrl}
                        alt={o.user.username ?? 'User'}
                        width={24}
                        height={24}
                        className="w-6 h-6 object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 bg-[#2A2A2A] flex items-center justify-center text-[10px] text-white">
                        {(o.user?.username ?? 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs text-white flex-1 truncate">{o.user?.username ?? 'Unknown'}</span>
                    {o.user?.sportTypes?.[0] && (
                      <span className="text-[10px] text-[#888888]">{getSportLabel(o.user.sportTypes[0])}</span>
                    )}
                    {o.checkin.workoutType && (
                      <span className="text-[10px] text-[#FF4500] border border-[#FF4500]/20 px-1">
                        {o.checkin.workoutType}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : showTypeSelect ? (
        <div>
          <p className="text-xs text-[#888888] mb-2">What are you training?</p>
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {WORKOUT_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => handleCheckin(type)}
                disabled={checking}
                className="py-1.5 text-xs font-semibold uppercase tracking-wider border border-[#2A2A2A] text-[#888888] hover:text-white hover:border-[#FF4500] transition-all disabled:opacity-50"
              >
                {type}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowTypeSelect(false)}
            className="text-xs text-[#555555] hover:text-[#888888]"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div>
          <p className="text-xs text-[#888888] mb-3">
            Check in to {gymName} to see who&apos;s training with you
          </p>
          <button
            onClick={() => setShowTypeSelect(true)}
            disabled={checking}
            className="w-full py-2.5 bg-[#FF4500] text-white text-xs font-semibold uppercase tracking-wider hover:shadow-[0_0_15px_rgba(255,69,0,0.4)] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            <MapPin className="w-4 h-4" />
            Check In to Gym
          </button>
        </div>
      )}
    </div>
  );
}
