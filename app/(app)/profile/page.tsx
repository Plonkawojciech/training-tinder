'use client';

export const dynamic = 'force-dynamic';

import nextDynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { useSafeUser } from '@/lib/auth';
import { Edit2, Save, X, Link2, Zap, Route, MapPin, Camera } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { SPORTS, getSportLabel, getSportColor, formatPaceMin } from '@/lib/utils';
import { StrengthBadge } from '@/components/gym/strength-badge';
import { Big4Display } from '@/components/gym/big4-display';
import { ProfileStatsSection } from '@/components/profile/stats-section';

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
  lat: number | null;
  lon: number | null;
  availability: string[];
  gymName: string | null;
  strengthLevel: string | null;
  trainingSplits: string[] | null;
  goals: string[] | null;
  heightCm: number | null;
}

interface PRRecord {
  exerciseName: string;
  weightKg: number;
  reps: number;
}

const STRENGTH_LEVELS = ['beginner', 'intermediate', 'advanced', 'elite'];
const TRAINING_SPLITS = [
  { value: 'push_pull_legs', label: 'Push/Pull/Legs' },
  { value: 'full_body', label: 'Full Body' },
  { value: 'upper_lower', label: 'Upper/Lower' },
  { value: 'bro_split', label: 'Bro Split' },
  { value: 'powerlifting', label: 'Powerlifting' },
];
const GOAL_OPTIONS = [
  { value: 'strength', label: 'Strength', emoji: '💪' },
  { value: 'hypertrophy', label: 'Hypertrophy', emoji: '🏋️' },
  { value: 'endurance', label: 'Endurance', emoji: '🏃' },
  { value: 'weight_loss', label: 'Weight Loss', emoji: '⚡' },
  { value: 'athletic', label: 'Athletic', emoji: '🎯' },
];
const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function ProfilePageInner() {
  const user = useSafeUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [topPRs, setTopPRs] = useState<PRRecord[]>([]);

  const [form, setForm] = useState({
    username: '',
    bio: '',
    sportTypes: [] as string[],
    paceMin: '',
    paceSec: '',
    weeklyKm: '',
    city: '',
    gymName: '',
    strengthLevel: '',
    trainingSplits: [] as string[],
    goals: [] as string[],
    availability: [] as string[],
    heightCm: '',
  });

  useEffect(() => {
    fetchProfile();
    fetch('/api/records')
      .then((r) => r.json())
      .then((data: { best: PRRecord[] }) => setTopPRs((data.best ?? []).slice(0, 3)))
      .catch(() => {});
  }, []);

  async function fetchProfile() {
    try {
      const res = await fetch('/api/users/profile');
      if (res.ok) {
        const data: UserProfile | null = await res.json();
        setProfile(data);
        if (data) {
          setForm({
            username: data.username ?? '',
            bio: data.bio ?? '',
            sportTypes: data.sportTypes ?? [],
            paceMin: data.pacePerKm ? String(Math.floor(data.pacePerKm / 60)) : '',
            paceSec: data.pacePerKm ? String(data.pacePerKm % 60).padStart(2, '0') : '',
            weeklyKm: data.weeklyKm ? String(data.weeklyKm) : '',
            city: data.city ?? '',
            gymName: data.gymName ?? '',
            strengthLevel: data.strengthLevel ?? '',
            trainingSplits: data.trainingSplits ?? [],
            goals: data.goals ?? [],
            availability: data.availability ?? [],
            heightCm: data.heightCm ? String(data.heightCm) : '',
          });
        }
      }
    } finally {
      setLoading(false);
    }
  }

  function toggleSport(sport: string) {
    setForm((prev) => ({
      ...prev,
      sportTypes: prev.sportTypes.includes(sport)
        ? prev.sportTypes.filter((s) => s !== sport)
        : [...prev.sportTypes, sport],
    }));
  }

  function toggleSplit(split: string) {
    setForm((prev) => ({
      ...prev,
      trainingSplits: prev.trainingSplits.includes(split)
        ? prev.trainingSplits.filter((s) => s !== split)
        : [...prev.trainingSplits, split],
    }));
  }

  function toggleGoal(goal: string) {
    setForm((prev) => ({
      ...prev,
      goals: prev.goals.includes(goal)
        ? prev.goals.filter((g) => g !== goal)
        : [...prev.goals, goal],
    }));
  }

  function toggleAvailability(day: string) {
    setForm((prev) => ({
      ...prev,
      availability: prev.availability.includes(day)
        ? prev.availability.filter((d) => d !== day)
        : [...prev.availability, day],
    }));
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload/avatar', { method: 'POST', body: fd });
      if (res.ok) {
        const { url } = await res.json() as { url: string };
        await fetch('/api/users/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatarUrl: url }),
        });
        fetchProfile();
      }
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const pacePerKm =
        form.paceMin && form.paceSec
          ? parseInt(form.paceMin) * 60 + parseInt(form.paceSec)
          : null;

      await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username,
          bio: form.bio,
          sportTypes: form.sportTypes,
          pacePerKm,
          weeklyKm: form.weeklyKm ? parseInt(form.weeklyKm) : null,
          city: form.city,
          gymName: form.gymName || null,
          strengthLevel: form.strengthLevel || null,
          trainingSplits: form.trainingSplits,
          goals: form.goals,
          availability: form.availability,
          heightCm: form.heightCm ? parseInt(form.heightCm) : null,
        }),
      });
      await fetchProfile();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#FF4500] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl text-white tracking-wider">MY PROFILE</h1>
        {!editing ? (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Edit2 className="w-4 h-4" />
            Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>
              <X className="w-4 h-4" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} loading={saving}>
              <Save className="w-4 h-4" />
              Save
            </Button>
          </div>
        )}
      </div>

      {/* Avatar + basic info */}
      <div className="bg-[#111111] border border-[#2A2A2A] p-6 mb-4">
        <div className="flex items-start gap-6">
          <div className="relative">
            <Avatar
              src={profile?.avatarUrl}
              fallback={profile?.username ?? user.username ?? '?'}
              size="xl"
            />
            <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#FF4500] flex items-center justify-center cursor-pointer hover:shadow-[0_0_10px_rgba(255,69,0,0.5)] transition-all">
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              {avatarUploading ? (
                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5 text-white" />
              )}
            </label>
          </div>

          <div className="flex-1">
            {editing ? (
              <div className="flex flex-col gap-3">
                <Input
                  label="Display Name"
                  value={form.username}
                  onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                  placeholder="Your athlete name"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="City"
                    value={form.city}
                    onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                    placeholder="Warsaw, Poland"
                  />
                  <Input
                    label="Height (cm)"
                    type="number"
                    value={form.heightCm}
                    onChange={(e) => setForm((p) => ({ ...p, heightCm: e.target.value }))}
                    placeholder="180"
                  />
                </div>
              </div>
            ) : (
              <>
                <h2 className="font-display text-2xl text-white tracking-wider">
                  {profile?.username ?? 'Set your name'}
                </h2>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {profile?.city && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#888888]" />
                      <span className="text-sm text-[#888888]">{profile.city}</span>
                    </div>
                  )}
                  {profile?.strengthLevel && (
                    <StrengthBadge level={profile.strengthLevel} size="sm" />
                  )}
                </div>
                {profile?.gymName && (
                  <p className="text-xs text-[#888888] mt-1">🏋️ {profile.gymName}</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Bio */}
        <div className="mt-6">
          {editing ? (
            <Textarea
              label="Bio"
              value={form.bio}
              onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
              placeholder="Tell other athletes about yourself..."
              className="min-h-[120px]"
            />
          ) : (
            profile?.bio && (
              <p className="text-[#888888] text-sm leading-relaxed">{profile.bio}</p>
            )
          )}
        </div>
      </div>

      {/* Training Stats (non-editing only) */}
      {!editing && <ProfileStatsSection />}

      {/* Sports */}
      <div className="bg-[#111111] border border-[#2A2A2A] p-6 mb-4">
        <h3 className="font-display text-sm text-[#888888] tracking-wider mb-4">SPORTS</h3>
        {editing ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SPORTS.map((sport) => {
              const color = getSportColor(sport.value);
              const isSelected = form.sportTypes.includes(sport.value);
              return (
                <button
                  key={sport.value}
                  type="button"
                  onClick={() => toggleSport(sport.value)}
                  className="p-2.5 border text-xs font-medium transition-all"
                  style={
                    isSelected
                      ? { border: `1px solid ${color}`, background: `${color}20`, color }
                      : { border: '1px solid #2A2A2A', background: 'transparent', color: '#888888' }
                  }
                >
                  {sport.label}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(profile?.sportTypes ?? []).map((sport) => (
              <Badge key={sport} sport={sport}>
                {getSportLabel(sport)}
              </Badge>
            ))}
            {(profile?.sportTypes?.length ?? 0) === 0 && (
              <p className="text-[#888888] text-sm">No sports selected</p>
            )}
          </div>
        )}
      </div>

      {/* Goals */}
      <div className="bg-[#111111] border border-[#2A2A2A] p-6 mb-4">
        <h3 className="font-display text-sm text-[#888888] tracking-wider mb-4">GOALS</h3>
        {editing ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {GOAL_OPTIONS.map((goal) => {
              const isSelected = form.goals.includes(goal.value);
              return (
                <button
                  key={goal.value}
                  type="button"
                  onClick={() => toggleGoal(goal.value)}
                  className="p-2.5 border text-xs font-medium transition-all flex items-center gap-2"
                  style={
                    isSelected
                      ? { borderColor: '#FF4500', background: 'rgba(255,69,0,0.1)', color: '#FF4500' }
                      : { borderColor: '#2A2A2A', background: 'transparent', color: '#888888' }
                  }
                >
                  <span>{goal.emoji}</span>
                  {goal.label}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(profile?.goals ?? []).map((goal) => {
              const opt = GOAL_OPTIONS.find((g) => g.value === goal);
              return (
                <span
                  key={goal}
                  className="flex items-center gap-1 px-2 py-1 border border-[rgba(255,69,0,0.3)] bg-[rgba(255,69,0,0.08)] text-[#FF4500] text-xs"
                >
                  {opt?.emoji} {opt?.label ?? goal}
                </span>
              );
            })}
            {(profile?.goals?.length ?? 0) === 0 && (
              <p className="text-[#888888] text-sm">No goals set</p>
            )}
          </div>
        )}
      </div>

      {/* Gym section */}
      <div className="bg-[#111111] border border-[#2A2A2A] p-6 mb-4">
        <h3 className="font-display text-sm text-[#888888] tracking-wider mb-4">GYM & STRENGTH</h3>
        {editing ? (
          <div className="flex flex-col gap-4">
            <Input
              label="Gym Name / Location"
              value={form.gymName}
              onChange={(e) => setForm((p) => ({ ...p, gymName: e.target.value }))}
              placeholder="e.g. Gold's Gym, Warsaw"
            />

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-2">
                Strength Level
              </label>
              <div className="grid grid-cols-4 gap-2">
                {STRENGTH_LEVELS.map((level) => {
                  const colors: Record<string, string> = {
                    beginner: '#00CC44', intermediate: '#FFD700',
                    advanced: '#FF8800', elite: '#FF4500',
                  };
                  const color = colors[level];
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, strengthLevel: level }))}
                      className="p-2 border text-xs font-medium capitalize transition-all"
                      style={
                        form.strengthLevel === level
                          ? { borderColor: color, background: `${color}20`, color }
                          : { borderColor: '#2A2A2A', background: 'transparent', color: '#888888' }
                      }
                    >
                      {level}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-2">
                Training Split
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TRAINING_SPLITS.map((split) => {
                  const isSelected = form.trainingSplits.includes(split.value);
                  return (
                    <button
                      key={split.value}
                      type="button"
                      onClick={() => toggleSplit(split.value)}
                      className="p-2 border text-xs font-medium transition-all"
                      style={
                        isSelected
                          ? { borderColor: '#FF4500', background: 'rgba(255,69,0,0.1)', color: '#FF4500' }
                          : { borderColor: '#2A2A2A', background: 'transparent', color: '#888888' }
                      }
                    >
                      {split.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {profile?.gymName && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[#888888]">Gym:</span>
                <span className="text-white">{profile.gymName}</span>
              </div>
            )}
            {profile?.strengthLevel && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[#888888]">Level:</span>
                <StrengthBadge level={profile.strengthLevel} />
              </div>
            )}
            {(profile?.trainingSplits ?? []).length > 0 && (
              <div>
                <p className="text-xs text-[#888888] mb-2">Training splits:</p>
                <div className="flex flex-wrap gap-1">
                  {(profile?.trainingSplits ?? []).map((split) => {
                    const opt = TRAINING_SPLITS.find((s) => s.value === split);
                    return (
                      <span key={split} className="px-2 py-1 bg-[#1A1A1A] border border-[#2A2A2A] text-[#888888] text-xs">
                        {opt?.label ?? split}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Personal Records showcase */}
      {!editing && topPRs.length > 0 && (
        <div className="mb-4">
          <Big4Display records={topPRs} />
        </div>
      )}

      {/* Availability */}
      <div className="bg-[#111111] border border-[#2A2A2A] p-6 mb-4">
        <h3 className="font-display text-sm text-[#888888] tracking-wider mb-4">AVAILABILITY</h3>
        {editing ? (
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {DAYS_OF_WEEK.map((day) => {
              const isSelected = form.availability.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleAvailability(day)}
                  className="p-2 border text-[10px] font-medium uppercase tracking-wider transition-all"
                  style={
                    isSelected
                      ? { borderColor: '#FF4500', background: 'rgba(255,69,0,0.1)', color: '#FF4500' }
                      : { borderColor: '#2A2A2A', background: 'transparent', color: '#888888' }
                  }
                >
                  {day.slice(0, 3)}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {DAYS_OF_WEEK.map((day) => {
              const isAvailable = (profile?.availability ?? []).includes(day);
              return (
                <div
                  key={day}
                  className="flex flex-col items-center gap-1"
                >
                  <div
                    className="w-full aspect-square flex items-center justify-center text-[10px] font-bold uppercase"
                    style={{
                      background: isAvailable ? 'rgba(255,69,0,0.15)' : '#0D0D0D',
                      border: isAvailable ? '1px solid rgba(255,69,0,0.4)' : '1px solid #1A1A1A',
                      color: isAvailable ? '#FF4500' : '#333333',
                    }}
                  >
                    {day.slice(0, 1).toUpperCase()}
                  </div>
                  <span className="text-[8px] text-[#555555] uppercase">{day.slice(0, 3)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Performance */}
      <div className="bg-[#111111] border border-[#2A2A2A] p-6 mb-4">
        <h3 className="font-display text-sm text-[#888888] tracking-wider mb-4">PERFORMANCE</h3>
        {editing ? (
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-2">
                Pace (min:sec /km)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="5"
                  min="1"
                  max="30"
                  value={form.paceMin}
                  onChange={(e) => setForm((p) => ({ ...p, paceMin: e.target.value }))}
                  className="w-20 bg-[#0A0A0A] border border-[#2A2A2A] text-white px-3 py-2.5 text-sm focus:border-[#FF4500] focus:outline-none text-center"
                />
                <span className="text-[#888888] text-xl">:</span>
                <input
                  type="number"
                  placeholder="30"
                  min="0"
                  max="59"
                  value={form.paceSec}
                  onChange={(e) => setForm((p) => ({ ...p, paceSec: e.target.value }))}
                  className="w-20 bg-[#0A0A0A] border border-[#2A2A2A] text-white px-3 py-2.5 text-sm focus:border-[#FF4500] focus:outline-none text-center"
                />
              </div>
            </div>
            <Input
              label="Weekly Distance (km)"
              type="number"
              value={form.weeklyKm}
              onChange={(e) => setForm((p) => ({ ...p, weeklyKm: e.target.value }))}
              placeholder="100"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[rgba(255,69,0,0.1)] border border-[rgba(255,69,0,0.2)] flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#FF4500]" />
              </div>
              <div>
                <p className="font-display text-xl text-white">
                  {profile?.pacePerKm ? formatPaceMin(profile.pacePerKm) : '--:--'}
                </p>
                <p className="text-xs text-[#888888]">min/km pace</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[rgba(255,69,0,0.1)] border border-[rgba(255,69,0,0.2)] flex items-center justify-center">
                <Route className="w-5 h-5 text-[#FF4500]" />
              </div>
              <div>
                <p className="font-display text-xl text-white">
                  {profile?.weeklyKm ?? '--'}
                </p>
                <p className="text-xs text-[#888888]">km/week</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Strava */}
      <div className="bg-[#111111] border border-[#2A2A2A] p-6">
        <h3 className="font-display text-sm text-[#888888] tracking-wider mb-4">INTEGRATIONS</h3>
        <button
          className="flex items-center gap-3 px-4 py-3 border border-[#FC4C02] bg-[rgba(252,76,2,0.1)] text-[#FC4C02] text-sm font-semibold hover:bg-[rgba(252,76,2,0.2)] transition-all"
          onClick={() => alert('Strava OAuth coming soon!')}
        >
          <Link2 className="w-4 h-4" />
          Connect Strava
        </button>
        <p className="text-xs text-[#888888] mt-2">
          Sync your training data from Strava automatically
        </p>
      </div>
    </div>
  );
}

export default nextDynamic(() => Promise.resolve({ default: ProfilePageInner }), { ssr: false });
