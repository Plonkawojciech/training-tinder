'use client';

import { useEffect, useState } from 'react';
import { MapPin, Clock, LogOut, Users } from 'lucide-react';
import { getSportLabel } from '@/lib/utils';
import Image from 'next/image';
import { useLang } from '@/lib/lang';

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
    authEmail: string;
    username: string | null;
    avatarUrl: string | null;
    sportTypes: string[];
  } | null;
}

interface CheckinResponse {
  myCheckin: CheckinData | null;
  checkins: OtherUser[];
}

export function CheckinWidget({ gymName, gymPlaceId }: { gymName?: string | null; gymPlaceId?: string | null }) {
  const { t } = useLang();

  const WORKOUT_TYPES = [
    'Push', 'Pull',
    t('workout_type_legs'), t('workout_type_upper'), t('workout_type_lower'),
    t('workout_type_full'), t('workout_type_cardio'), t('workout_type_other'),
  ];
  const [myCheckin, setMyCheckin] = useState<CheckinData | null>(null);
  const [others, setOthers] = useState<OtherUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [elapsed, setElapsed] = useState('');
  const [workoutType] = useState('');
  const [showTypeSelect, setShowTypeSelect] = useState(false);

  useEffect(() => {
    function load() {
      const params = new URLSearchParams();
      if (gymPlaceId) params.set('gymPlaceId', gymPlaceId);
      else if (gymName) params.set('gymName', gymName);

      fetch(`/api/checkin?${params}`)
        .then((res) => res.ok ? res.json() as Promise<CheckinResponse> : null)
        .then((data) => {
          if (data) {
            setMyCheckin(data.myCheckin);
            setOthers(data.checkins.filter((o) => o.checkin.userId !== data.myCheckin?.userId));
          }
          setLoading(false);
        });
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [gymName, gymPlaceId]);

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
      const params = new URLSearchParams();
      if (gymPlaceId) params.set('gymPlaceId', gymPlaceId);
      else if (gymName) params.set('gymName', gymName);
      const refreshRes = await fetch(`/api/checkin?${params}`);
      if (refreshRes.ok) {
        const data: CheckinResponse = await refreshRes.json();
        setMyCheckin(data.myCheckin);
        setOthers(data.checkins.filter((o) => o.checkin.userId !== data.myCheckin?.userId));
      }
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
      <div className="bg-[var(--bg-card)] border border-[var(--border)] p-4">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-4 h-4 text-[#888888]" />
          <h3 className="font-display text-sm text-[#888888] tracking-wider">{t('checkin_heading')}</h3>
        </div>
        <p className="text-xs text-[#555555]">{t('checkin_set_gym_hint')}</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] p-4">
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-4 h-4 text-[#6366F1]" />
        <h3 className="font-display text-sm text-[#888888] tracking-wider">{t('checkin_heading')}</h3>
      </div>

      {loading ? (
        <div className="h-12 skeleton" />
      ) : myCheckin ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-white font-semibold">{t('checkin_at')} {myCheckin.gymName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3 h-3 text-[#888888]" />
                <span className="text-xs text-[#888888]">{elapsed || '0m'}</span>
                {myCheckin.workoutType && (
                  <span className="text-xs text-[#6366F1] border border-[#6366F1]/30 px-1.5 py-0.5">
                    {myCheckin.workoutType}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={handleCheckout}
              disabled={checking}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[var(--border)] text-[#888888] hover:text-red-400 hover:border-red-800 text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-50"
            >
              <LogOut className="w-3 h-3" />
              {t('checkin_checkout')}
            </button>
          </div>

          {others.length > 0 && (
            <div className="border-t border-[var(--border)] pt-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Users className="w-3 h-3 text-[#888888]" />
                <span className="text-xs text-[#888888]">{others.length === 1 ? t('checkin_person_here', { count: String(others.length) }) : t('checkin_people_here', { count: String(others.length) })}</span>
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
                    <span className="text-xs text-white flex-1 truncate">{o.user?.username ?? t('checkin_unknown_user')}</span>
                    {o.user?.sportTypes?.[0] && (
                      <span className="text-[10px] text-[#888888]">{getSportLabel(o.user.sportTypes[0])}</span>
                    )}
                    {o.checkin.workoutType && (
                      <span className="text-[10px] text-[#6366F1] border border-[#6366F1]/20 px-1">
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
          <p className="text-xs text-[#888888] mb-2">{t('checkin_what_workout')}</p>
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {WORKOUT_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => handleCheckin(type)}
                disabled={checking}
                className="py-1.5 text-xs font-semibold uppercase tracking-wider border border-[var(--border)] text-[#888888] hover:text-white hover:border-[#6366F1] transition-all disabled:opacity-50"
              >
                {type}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowTypeSelect(false)}
            className="text-xs text-[#555555] hover:text-[#888888]"
          >
            {t('checkin_cancel')}
          </button>
        </div>
      ) : (
        <div>
          <p className="text-xs text-[#888888] mb-3">
            {t('checkin_prompt', { gym: gymName })}
          </p>
          <button
            onClick={() => setShowTypeSelect(true)}
            disabled={checking}
            className="w-full py-2.5 bg-[#6366F1] text-white text-xs font-semibold uppercase tracking-wider hover:shadow-[0_0_15px_rgba(99,102,241,0.4)] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            <MapPin className="w-4 h-4" />
            {t('checkin_button')}
          </button>
        </div>
      )}
    </div>
  );
}
