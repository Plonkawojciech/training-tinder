'use client';

import React from 'react';
import { Input, Textarea } from '@/components/ui/input';
import { SPORTS, getSportColor, GYM_SPORTS } from '@/lib/utils';

export interface OnboardingData {
  username: string;
  bio: string;
  sportTypes: string[];
  pacePerKm: string;
  weeklyKm: string;
  city: string;
  lat: string;
  lon: string;
  availability: string[];
  avatarUrl: string;
  // Gym fields
  gymName: string;
  strengthLevel: string;
  trainingSplits: string[];
  goals: string[];
}

interface StepProps {
  data: OnboardingData;
  onChange: (updates: Partial<OnboardingData>) => void;
}

const AVAILABILITY_OPTIONS = [
  'Early Morning (5-8am)',
  'Morning (8-11am)',
  'Midday (11am-2pm)',
  'Afternoon (2-5pm)',
  'Evening (5-8pm)',
  'Night (8pm+)',
  'Weekdays',
  'Weekends',
];

const STRENGTH_LEVELS = [
  { value: 'beginner', label: 'Beginner', color: '#00CC44' },
  { value: 'intermediate', label: 'Intermediate', color: '#FFD700' },
  { value: 'advanced', label: 'Advanced', color: '#FF8800' },
  { value: 'elite', label: 'Elite', color: '#FF4500' },
];

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
  { value: 'athletic', label: 'Athletic Performance', emoji: '🎯' },
];

// Split sports into categories for better display
const ENDURANCE_SPORTS = SPORTS.filter((s) => !GYM_SPORTS.includes(s.value));
const GYM_SPORT_LIST = SPORTS.filter((s) => GYM_SPORTS.includes(s.value));

export function Step1SportsBio({ data, onChange }: StepProps) {
  function toggleSport(sport: string) {
    const current = data.sportTypes;
    const updated = current.includes(sport)
      ? current.filter((s) => s !== sport)
      : [...current, sport];
    onChange({ sportTypes: updated });
  }

  const hasGymSport = data.sportTypes.some((s) => GYM_SPORTS.includes(s));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-1">
          Endurance Sports
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {ENDURANCE_SPORTS.map((sport) => {
            const color = getSportColor(sport.value);
            const isSelected = data.sportTypes.includes(sport.value);
            return (
              <button
                key={sport.value}
                type="button"
                onClick={() => toggleSport(sport.value)}
                className="p-3 border text-sm font-medium transition-all text-left"
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

        <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-1">
          Gym & Strength
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {GYM_SPORT_LIST.map((sport) => {
            const color = getSportColor(sport.value);
            const isSelected = data.sportTypes.includes(sport.value);
            return (
              <button
                key={sport.value}
                type="button"
                onClick={() => toggleSport(sport.value)}
                className="p-3 border text-sm font-medium transition-all text-left"
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

        {data.sportTypes.length === 0 && (
          <p className="text-xs text-red-400 mt-2">Select at least one sport</p>
        )}

        {hasGymSport && (
          <div className="mt-2 p-2 bg-[rgba(255,69,0,0.06)] border border-[rgba(255,69,0,0.2)] text-xs text-[#FF4500]">
            You selected gym sports — we will ask about your strength level next!
          </div>
        )}
      </div>

      <Input
        label="Display Name"
        value={data.username}
        onChange={(e) => onChange({ username: e.target.value })}
        placeholder="Your athlete name"
      />

      <Textarea
        label="Bio (optional)"
        value={data.bio}
        onChange={(e) => onChange({ bio: e.target.value })}
        placeholder="Tell other athletes about yourself, your goals, and training style..."
        className="min-h-[120px]"
      />
    </div>
  );
}

export function Step2Performance({ data, onChange }: StepProps) {
  const paceMin = data.pacePerKm
    ? Math.floor(Number(data.pacePerKm) / 60).toString()
    : '';
  const paceSec = data.pacePerKm
    ? (Number(data.pacePerKm) % 60).toString().padStart(2, '0')
    : '';

  function handlePaceChange(minutes: string, seconds: string) {
    const m = parseInt(minutes) || 0;
    const s = parseInt(seconds) || 0;
    if (m > 0 || s > 0) {
      onChange({ pacePerKm: String(m * 60 + s) });
    } else {
      onChange({ pacePerKm: '' });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-3">
          Average Pace (min/km)
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="5"
            min="1"
            max="30"
            value={paceMin}
            onChange={(e) => handlePaceChange(e.target.value, paceSec)}
            className="w-20 bg-[#0A0A0A] border border-[#2A2A2A] text-white px-3 py-2.5 text-sm focus:border-[#FF4500] focus:outline-none text-center"
          />
          <span className="text-[#888888] text-xl">:</span>
          <input
            type="number"
            placeholder="30"
            min="0"
            max="59"
            value={paceSec}
            onChange={(e) => handlePaceChange(paceMin, e.target.value)}
            className="w-20 bg-[#0A0A0A] border border-[#2A2A2A] text-white px-3 py-2.5 text-sm focus:border-[#FF4500] focus:outline-none text-center"
          />
          <span className="text-[#888888] text-sm">/km</span>
        </div>
        <p className="text-xs text-[#888888] mt-1">Used for running/cycling pace matching</p>
      </div>

      <Input
        label="Weekly Distance (km)"
        type="number"
        value={data.weeklyKm}
        onChange={(e) => onChange({ weeklyKm: e.target.value })}
        placeholder="100"
        min="0"
        max="1000"
        hint="Your average weekly training distance across all sports"
      />
    </div>
  );
}

export function Step3Location({ data, onChange }: StepProps) {
  function toggleAvailability(slot: string) {
    const current = data.availability;
    const updated = current.includes(slot)
      ? current.filter((s) => s !== slot)
      : [...current, slot];
    onChange({ availability: updated });
  }

  async function detectLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      onChange({
        lat: String(pos.coords.latitude),
        lon: String(pos.coords.longitude),
      });
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Input
        label="City / Area"
        value={data.city}
        onChange={(e) => onChange({ city: e.target.value })}
        placeholder="e.g. Warsaw, Poland"
      />

      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-3">
          GPS Coordinates (optional)
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Latitude"
            value={data.lat}
            onChange={(e) => onChange({ lat: e.target.value })}
            className="flex-1 bg-[#0A0A0A] border border-[#2A2A2A] text-white px-3 py-2.5 text-sm focus:border-[#FF4500] focus:outline-none placeholder:text-[#444444]"
            step="any"
          />
          <input
            type="number"
            placeholder="Longitude"
            value={data.lon}
            onChange={(e) => onChange({ lon: e.target.value })}
            className="flex-1 bg-[#0A0A0A] border border-[#2A2A2A] text-white px-3 py-2.5 text-sm focus:border-[#FF4500] focus:outline-none placeholder:text-[#444444]"
            step="any"
          />
          <button
            type="button"
            onClick={detectLocation}
            className="px-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] text-[#888888] hover:text-white hover:border-[#FF4500] text-sm transition-all"
          >
            Auto
          </button>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-3">
          Training Availability
        </label>
        <div className="grid grid-cols-2 gap-2">
          {AVAILABILITY_OPTIONS.map((slot) => {
            const isSelected = data.availability.includes(slot);
            return (
              <button
                key={slot}
                type="button"
                onClick={() => toggleAvailability(slot)}
                className="p-2.5 border text-xs font-medium text-left transition-all"
                style={
                  isSelected
                    ? { border: '1px solid #FF4500', background: 'rgba(255,69,0,0.1)', color: '#FF4500' }
                    : { border: '1px solid #2A2A2A', background: 'transparent', color: '#888888' }
                }
              >
                {slot}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function Step3HalfGym({ data, onChange }: StepProps) {
  function toggleSplit(split: string) {
    const current = data.trainingSplits ?? [];
    const updated = current.includes(split)
      ? current.filter((s) => s !== split)
      : [...current, split];
    onChange({ trainingSplits: updated });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs text-[#FF4500] uppercase tracking-wider font-bold mb-4">
          Gym Profile Setup
        </p>

        <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-3">
          Strength Level
        </label>
        <div className="grid grid-cols-2 gap-2">
          {STRENGTH_LEVELS.map((level) => {
            const isSelected = data.strengthLevel === level.value;
            return (
              <button
                key={level.value}
                type="button"
                onClick={() => onChange({ strengthLevel: level.value })}
                className="p-3 border text-sm font-medium transition-all text-left"
                style={
                  isSelected
                    ? { borderColor: level.color, background: `${level.color}20`, color: level.color }
                    : { borderColor: '#2A2A2A', background: 'transparent', color: '#888888' }
                }
              >
                <div className="font-bold">{level.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-3">
          Training Split
        </label>
        <div className="grid grid-cols-2 gap-2">
          {TRAINING_SPLITS.map((split) => {
            const isSelected = (data.trainingSplits ?? []).includes(split.value);
            return (
              <button
                key={split.value}
                type="button"
                onClick={() => toggleSplit(split.value)}
                className="p-2.5 border text-xs font-medium transition-all text-left"
                style={
                  isSelected
                    ? { border: '1px solid #FF4500', background: 'rgba(255,69,0,0.1)', color: '#FF4500' }
                    : { border: '1px solid #2A2A2A', background: 'transparent', color: '#888888' }
                }
              >
                {split.label}
              </button>
            );
          })}
        </div>
      </div>

      <Input
        label="Preferred Gym Name (optional)"
        value={data.gymName ?? ''}
        onChange={(e) => onChange({ gymName: e.target.value })}
        placeholder="e.g. Gold's Gym Downtown"
        hint="Used to match you with athletes at the same gym"
      />
    </div>
  );
}

export function Step4Photo({ data, onChange }: StepProps) {
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState('');

  function toggleGoal(goal: string) {
    const current = data.goals ?? [];
    const updated = current.includes(goal)
      ? current.filter((g) => g !== goal)
      : [...current, goal];
    onChange({ goals: updated });
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('File must be under 5MB');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const { url } = await res.json() as { url: string };
      onChange({ avatarUrl: url });
    } catch {
      setError('Upload failed. Try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Photo section */}
      <div className="flex flex-col items-center gap-4">
        {data.avatarUrl ? (
          <div className="flex flex-col items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.avatarUrl}
              alt="Profile"
              className="w-32 h-32 object-cover border-2 border-[#FF4500]"
            />
            <p className="text-sm text-[#00CC44]">Photo uploaded!</p>
          </div>
        ) : (
          <div className="w-32 h-32 bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center">
            <span className="font-display text-4xl text-[#FF4500]">
              {data.username?.[0]?.toUpperCase() ?? '?'}
            </span>
          </div>
        )}

        <div className="flex flex-col items-center gap-3 w-full max-w-xs">
          <label className="cursor-pointer w-full">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-full py-3 bg-[#1A1A1A] border border-[#2A2A2A] text-center text-sm text-white hover:border-[#FF4500] transition-all cursor-pointer uppercase tracking-wider font-semibold">
              {uploading ? 'Uploading...' : 'Choose Photo'}
            </div>
          </label>
          <p className="text-xs text-[#888888] text-center">
            Upload a clear photo of yourself. Max 5MB. JPEG, PNG, WebP.
          </p>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      </div>

      {/* Goals section */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-3">
          Training Goals (select all that apply)
        </label>
        <div className="grid grid-cols-2 gap-2">
          {GOAL_OPTIONS.map((goal) => {
            const isSelected = (data.goals ?? []).includes(goal.value);
            return (
              <button
                key={goal.value}
                type="button"
                onClick={() => toggleGoal(goal.value)}
                className="p-3 border text-sm font-medium transition-all flex items-center gap-2"
                style={
                  isSelected
                    ? { borderColor: '#FF4500', background: 'rgba(255,69,0,0.1)', color: '#FF4500' }
                    : { borderColor: '#2A2A2A', background: 'transparent', color: '#888888' }
                }
              >
                <span className="text-lg">{goal.emoji}</span>
                <span>{goal.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
