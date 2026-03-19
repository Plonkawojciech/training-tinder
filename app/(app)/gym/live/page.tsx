'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Radio, Clock, MessageSquare, Users, Dumbbell, Plus, Timer, Save, X, Play, Pause } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { SpotterRequest } from '@/components/gym/spotter-request';
import { formatRelativeTime } from '@/lib/utils';
import { useLang } from '@/lib/lang';

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
    authEmail: string;
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
    authEmail: string;
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
  const { t } = useLang();
  const [data, setData] = useState<LiveData | null>(null);
  const [spotters, setSpotters] = useState<SpotterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);

  // Live workout tracker state
  const [workoutActive, setWorkoutActive] = useState(false);
  const [workoutTimer, setWorkoutTimer] = useState(0);
  const [exercises, setExercises] = useState<Array<{ name: string; sets: Array<{ reps: number; weight: number }> }>>([]);
  const [newExName, setNewExName] = useState('');
  const [restTimer, setRestTimer] = useState(0);
  const [restRunning, setRestRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const restRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    function load() {
      Promise.all([
        fetch('/api/checkin'),
        fetch('/api/spotter'),
      ]).then(async ([checkinRes, spotterRes]) => {
        if (checkinRes.ok) setData(await checkinRes.json());
        if (spotterRes.ok) setSpotters(await spotterRes.json());
        setLoading(false);
      });
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  async function acceptSpotter(id: number) {
    setAcceptingId(id);
    await fetch('/api/spotter', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'accept' }),
    });
    const [checkinRes, spotterRes] = await Promise.all([
      fetch('/api/checkin'),
      fetch('/api/spotter'),
    ]);
    if (checkinRes.ok) setData(await checkinRes.json());
    if (spotterRes.ok) setSpotters(await spotterRes.json());
    setAcceptingId(null);
  }

  // Workout timer effect
  useEffect(() => {
    if (workoutActive) {
      timerRef.current = setInterval(() => setWorkoutTimer(s => s + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [workoutActive]);

  // Rest timer effect
  useEffect(() => {
    if (restRunning && restTimer > 0) {
      restRef.current = setInterval(() => {
        setRestTimer(s => {
          if (s <= 1) { setRestRunning(false); return 0; }
          return s - 1;
        });
      }, 1000);
    } else if (restRef.current) {
      clearInterval(restRef.current);
    }
    return () => { if (restRef.current) clearInterval(restRef.current); };
  }, [restRunning, restTimer]);

  const addExercise = useCallback(() => {
    if (!newExName.trim()) return;
    setExercises(prev => [...prev, { name: newExName.trim(), sets: [{ reps: 0, weight: 0 }] }]);
    setNewExName('');
  }, [newExName]);

  const addSet = useCallback((exIdx: number) => {
    setExercises(prev => prev.map((ex, i) =>
      i === exIdx ? { ...ex, sets: [...ex.sets, { reps: 0, weight: 0 }] } : ex
    ));
  }, []);

  const updateSet = useCallback((exIdx: number, setIdx: number, field: 'reps' | 'weight', val: number) => {
    setExercises(prev => prev.map((ex, i) =>
      i === exIdx ? { ...ex, sets: ex.sets.map((s, j) => j === setIdx ? { ...s, [field]: val } : s) } : ex
    ));
  }, []);

  const removeExercise = useCallback((exIdx: number) => {
    setExercises(prev => prev.filter((_, i) => i !== exIdx));
  }, []);

  const startRest = useCallback((seconds: number) => {
    setRestTimer(seconds);
    setRestRunning(true);
  }, []);

  const saveWorkout = useCallback(async () => {
    if (exercises.length === 0) return;
    setSaving(true);
    try {
      await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Live Workout`,
          type: 'gym',
          durationMin: Math.floor(workoutTimer / 60),
          exercises: exercises.map(ex => ({
            name: ex.name,
            sets: ex.sets,
          })),
          visibility: 'public',
        }),
      });
      setExercises([]);
      setWorkoutActive(false);
      setWorkoutTimer(0);
    } finally {
      setSaving(false);
    }
  }, [exercises, workoutTimer]);

  const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const myCheckin = data?.myCheckin;
  const allCheckins = data?.checkins ?? [];

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
            <span className="font-display text-xs text-green-400 tracking-wider">{t('live_badge')}</span>
          </div>
          <h1 className="font-display text-3xl text-white tracking-wider">{t('live_title')}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-green-400" />
          <span className="text-xs text-[#888888]">{t('live_refresh')}</span>
        </div>
      </div>

      {/* My status */}
      {myCheckin && (
        <div className="bg-[var(--bg-card)] border border-[#6366F1]/30 p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-[#6366F1] rounded-full animate-pulse" />
            <p className="text-white text-sm">
              {t('live_checked_in')} <span className="text-[#6366F1] font-semibold">{myCheckin.gymName}</span>
              {myCheckin.workoutType && (
                <span className="text-[#888888]"> — {myCheckin.workoutType}</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Live Workout Tracker */}
      {myCheckin && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Timer className="w-5 h-5 text-[#6366F1]" />
              <h2 className="font-display text-lg tracking-wider" style={{ color: 'var(--text)' }}>
                {t('gym_live_tracker')}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              {/* Workout timer */}
              <span className="font-mono text-xl font-bold" style={{ color: workoutActive ? '#22C55E' : 'var(--text-muted)' }}>
                {fmtTime(workoutTimer)}
              </span>
              <button
                onClick={() => setWorkoutActive(!workoutActive)}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: workoutActive ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)' }}
              >
                {workoutActive ? <Pause className="w-4 h-4 text-red-400" /> : <Play className="w-4 h-4 text-green-400" />}
              </button>
            </div>
          </div>

          {/* Rest timer */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{t('gym_rest_timer')}:</span>
            {[60, 90, 120, 180].map(s => (
              <button key={s} onClick={() => startRest(s)}
                className="px-3 py-2 rounded text-xs font-medium min-h-[44px] min-w-[44px]"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                {s}s
              </button>
            ))}
            {restRunning && (
              <span className="ml-2 font-mono text-sm font-bold text-orange-400 animate-pulse">
                {fmtTime(restTimer)}
              </span>
            )}
          </div>

          {/* Add exercise */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newExName}
              onChange={e => setNewExName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addExercise()}
              placeholder={t('live_add_exercise')}
              className="flex-1 px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
            <button onClick={addExercise}
              className="px-3 py-2 rounded-lg flex items-center gap-1 text-sm font-medium"
              style={{ background: 'rgba(99,102,241,0.15)', color: '#6366F1' }}>
              <Plus className="w-4 h-4" /> {t('gen_add')}
            </button>
          </div>

          {/* Exercises list */}
          {exercises.map((ex, exIdx) => (
            <div key={exIdx} className="mb-3 p-3 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{ex.name}</span>
                <button onClick={() => removeExercise(exIdx)} className="text-red-400 hover:text-red-300">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1">
                {ex.sets.map((set, setIdx) => (
                  <div key={setIdx} className="flex items-center gap-2 text-xs">
                    <span style={{ color: 'var(--text-muted)', width: 40 }}>Set {setIdx + 1}</span>
                    <input type="number" value={set.reps || ''} onChange={e => updateSet(exIdx, setIdx, 'reps', +e.target.value)}
                      placeholder="reps" className="w-16 px-2 py-1 rounded text-center"
                      style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                    <span style={{ color: 'var(--text-muted)' }}>×</span>
                    <input type="number" value={set.weight || ''} onChange={e => updateSet(exIdx, setIdx, 'weight', +e.target.value)}
                      placeholder="kg" className="w-16 px-2 py-1 rounded text-center"
                      style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                    <span style={{ color: 'var(--text-muted)' }}>kg</span>
                  </div>
                ))}
              </div>
              <button onClick={() => addSet(exIdx)} className="mt-2 text-xs font-medium" style={{ color: '#6366F1' }}>
                + {t('live_add_set')}
              </button>
            </div>
          ))}

          {/* Save */}
          {exercises.length > 0 && (
            <button onClick={saveWorkout} disabled={saving}
              className="w-full mt-2 py-3 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm transition-opacity"
              style={{ background: '#6366F1', color: 'white', opacity: saving ? 0.6 : 1 }}>
              <Save className="w-4 h-4" />
              {saving ? t('gen_saving') : t('gym_save_workout')}
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Active checkins */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Gym breakdown */}
          {!loading && Object.keys(gymGroups).length > 0 && (
            <div>
              <h2 className="font-display text-sm text-[#888888] tracking-wider mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#6366F1]" />
                {t('live_active_gyms')} ({Object.keys(gymGroups).length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(gymGroups).map(([gym, users]) => (
                  <div key={gym} className="bg-[var(--bg-card)] border border-[var(--border)] p-3 flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-semibold truncate">{gym}</p>
                      <p className="text-xs text-[#888888]">{users.length} {users.length === 1 ? t('live_athlete') : t('live_athletes')}</p>
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
                        <div className="w-6 h-6 bg-[#6366F1] flex items-center justify-center text-[10px] text-white border border-[#111111]">
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
              <Dumbbell className="w-4 h-4 text-[#6366F1]" />
              {t('live_all_checkins')} ({allCheckins.length})
            </h2>

            {loading ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 skeleton" />
                ))}
              </div>
            ) : allCheckins.length === 0 ? (
              <div className="bg-[var(--bg-card)] border border-[var(--border)] p-8 text-center">
                <Users className="w-10 h-10 text-[#2A2A2A] mx-auto mb-3" />
                <p className="text-[#888888] text-sm">{t('live_nobody')}</p>
                <p className="text-xs text-[#555555] mt-1">{t('live_be_first')}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {allCheckins.map((item) => (
                  <div key={item.checkin.id} className="bg-[var(--bg-card)] border border-[var(--border)] p-4 flex items-center gap-3">
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
                        <span className="text-white text-sm font-semibold">{item.user?.username ?? t('gen_athlete')}</span>
                        {item.checkin.workoutType && (
                          <span className="text-[10px] text-[#6366F1] border border-[#6366F1]/30 px-1.5 py-0.5">
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

                    {item.user?.authEmail && item.checkin.userId !== myCheckin?.userId && (
                      <Link
                        href={`/messages?partner=${item.user.authEmail}&name=${encodeURIComponent(item.user.username ?? '')}`}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-[var(--border)] text-[#888888] hover:text-white hover:border-[#00D4FF] text-xs font-semibold uppercase tracking-wider transition-all"
                      >
                        <MessageSquare className="w-3 h-3" />
                        {t('live_message')}
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
                {t('live_spotter_reqs')} ({spotters.length})
              </h2>
              <div className="flex flex-col gap-3">
                {spotters.map((s) => (
                  <div key={s.request.id} className="bg-[var(--bg-card)] border border-red-900/40 p-4">
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
                          <p className="text-white text-sm font-semibold">{s.requester?.username ?? t('gen_athlete')}</p>
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
                        <span className="text-xs text-[#6366F1] border border-[#6366F1]/30 px-2 py-0.5">
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
                        {acceptingId === s.request.id ? t('live_accepting') : t('live_help')}
                      </button>
                      {s.requester?.authEmail && (
                        <Link
                          href={`/messages?partner=${s.requester.authEmail}&name=${encodeURIComponent(s.requester.username ?? '')}`}
                          className="px-4 py-2 border border-[var(--border)] text-[#888888] hover:text-white hover:border-[#00D4FF] text-xs font-semibold uppercase tracking-wider transition-all"
                        >
                          {t('live_message')}
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
            <div className="bg-[var(--bg-card)] border border-[var(--border)] p-4">
              <h3 className="font-display text-sm text-[#888888] tracking-wider mb-3">{t('gym_need_help')}</h3>
              <SpotterRequest gymName={myCheckin.gymName} gymPlaceId={myCheckin.gymPlaceId} />
            </div>
          )}

          {/* Stats */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] p-4">
            <h3 className="font-display text-sm text-[#888888] tracking-wider mb-3">{t('live_stats')}</h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#888888]">{t('live_training_athletes')}</span>
                <span className="font-display text-lg text-white">{allCheckins.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#888888]">{t('live_active_gyms_stat')}</span>
                <span className="font-display text-lg text-white">{Object.keys(gymGroups).length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#888888]">{t('live_spotter_stat')}</span>
                <span className="font-display text-lg text-[#6366F1]">{spotters.length}</span>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] p-4">
            <h3 className="font-display text-sm text-[#888888] tracking-wider mb-3">{t('live_quick_links')}</h3>
            <div className="flex flex-col gap-2">
              <Link
                href="/gym"
                className="flex items-center justify-between p-2.5 border border-[var(--border)] hover:border-[#6366F1] text-sm text-[#888888] hover:text-white transition-all"
              >
                <span>{t('live_gym_center')}</span>
                <Dumbbell className="w-4 h-4" />
              </Link>
              <Link
                href="/gym/finder"
                className="flex items-center justify-between p-2.5 border border-[var(--border)] hover:border-[#6366F1] text-sm text-[#888888] hover:text-white transition-all"
              >
                <span>{t('gym_find_gym')}</span>
                <span className="text-xs">📍</span>
              </Link>
              <Link
                href="/discover"
                className="flex items-center justify-between p-2.5 border border-[var(--border)] hover:border-[#6366F1] text-sm text-[#888888] hover:text-white transition-all"
              >
                <span>{t('live_find_partners')}</span>
                <span className="text-xs">🤝</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
