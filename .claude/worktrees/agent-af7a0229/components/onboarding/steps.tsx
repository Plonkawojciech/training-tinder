'use client';

import React, { useState } from 'react';
import { Input, Textarea } from '@/components/ui/input';
import { SPORTS, getSportColor, GYM_SPORTS, getSportLabel } from '@/lib/utils';
import { PaceInput } from '@/components/ui/pace-input';

export interface SportProfileData {
  pacePerKmSec?: number;
  avgSpeedKmh?: number;
  weeklyKm?: number;
  weeklyHours?: number;
  ftpWatts?: number;
  vo2max?: number;
  restingHr?: number;
  maxHr?: number;
  level?: string;
  yearsExperience?: number;
}

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
  // Advanced athlete fields
  athleteLevel: string;
  ftpWatts: string;
  vo2max: string;
  restingHr: string;
  maxHr: string;
  sportProfiles: Record<string, SportProfileData>;
  // Demographics
  age: string;
  gender: string;
  weightKg: string;
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
  { value: 'advanced', label: 'Advanced', color: '#A78BFA' },
  { value: 'elite', label: 'Elite', color: '#7C3AED' },
];

const ATHLETE_LEVELS = [
  { value: 'beginner', label: 'Beginner', desc: 'Just getting started', color: '#00CC44' },
  { value: 'recreational', label: 'Recreational', desc: 'Train for fun & fitness', color: '#FFD700' },
  { value: 'competitive', label: 'Amateur Competitor', desc: 'Race & compete regularly', color: '#A78BFA' },
  { value: 'elite', label: 'Elite', desc: 'Professional / semi-pro level', color: '#7C3AED' },
];

const YEARS_EXPERIENCE = [
  { value: 0, label: '< 1 year' },
  { value: 1, label: '1 year' },
  { value: 2, label: '2–3 years' },
  { value: 4, label: '4–5 years' },
  { value: 6, label: '5+ years' },
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

// Endurance sports that have pace/speed fields
const ENDURANCE_SPORT_VALUES = [
  'cycling', 'running', 'triathlon', 'swimming', 'trail_running', 'gravel', 'duathlon', 'mtb',
];

// Sports that use FTP (power meter)
const FTP_SPORTS = ['cycling', 'gravel', 'mtb', 'triathlon', 'duathlon'];

// Sports that use VO2max
const VO2MAX_SPORTS = ['running', 'trail_running', 'triathlon', 'duathlon'];

// Split sports into categories for better display
const ENDURANCE_SPORTS = SPORTS.filter((s) => !GYM_SPORTS.includes(s.value));
const GYM_SPORT_LIST = SPORTS.filter((s) => GYM_SPORTS.includes(s.value));

const GENDER_OPTIONS = [
  { value: 'male', label: 'Mężczyzna' },
  { value: 'female', label: 'Kobieta' },
  { value: 'other', label: 'Inne' },
];

export function Step1SportsBio({ data, onChange }: StepProps) {
  function toggleSport(sport: string) {
    const current = data.sportTypes;
    const updated = current.includes(sport)
      ? current.filter((s) => s !== sport)
      : [...current, sport];
    onChange({ sportTypes: updated });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Sports */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-1">
          Sporty wytrzymałościowe
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
          Siłownia
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
          <p className="text-xs text-red-400 mt-2">Wybierz co najmniej jeden sport</p>
        )}
      </div>

      <Input
        label="Nazwa wyświetlana"
        value={data.username}
        onChange={(e) => onChange({ username: e.target.value })}
        placeholder="Twoja nazwa sportowa"
      />

      <Textarea
        label="Bio (opcjonalne)"
        value={data.bio}
        onChange={(e) => onChange({ bio: e.target.value })}
        placeholder="Opisz siebie, swoje cele i styl treningowy..."
        className="min-h-[100px]"
      />

      {/* Age */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-2">
          Wiek
        </label>
        <input
          type="number"
          placeholder="np. 28"
          min="13"
          max="100"
          value={data.age}
          onChange={(e) => onChange({ age: e.target.value })}
          className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2.5 text-sm focus:border-[#7C3AED] focus:outline-none placeholder:text-[#444444]"
        />
      </div>

      {/* Gender */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-2">
          Płeć
        </label>
        <div className="flex gap-2">
          {GENDER_OPTIONS.map((opt) => {
            const isSelected = data.gender === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ gender: opt.value })}
                className="flex-1 py-2.5 border text-sm font-medium transition-all"
                style={
                  isSelected
                    ? { borderColor: '#7C3AED', background: 'rgba(124,58,237,0.1)', color: '#7C3AED' }
                    : { borderColor: '#2A2A2A', background: 'transparent', color: '#888888' }
                }
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Weight — only for female */}
      {(data.gender === 'female' || data.gender === 'Kobieta') && (
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-2">
            Waga (kg)
          </label>
          <input
            type="number"
            placeholder="np. 60"
            min="30"
            max="200"
            step="0.5"
            value={data.weightKg}
            onChange={(e) => onChange({ weightKg: e.target.value })}
            className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2.5 text-sm focus:border-[#7C3AED] focus:outline-none placeholder:text-[#444444]"
          />
        </div>
      )}
    </div>
  );
}

export function Step2LocationAvailability({ data, onChange }: StepProps) {
  function toggleAvailability(slot: string) {
    const current = data.availability;
    const updated = current.includes(slot)
      ? current.filter((s) => s !== slot)
      : [...current, slot];
    onChange({ availability: updated });
  }

  return (
    <div className="flex flex-col gap-6">
      <Input
        label="Miasto / Region"
        value={data.city}
        onChange={(e) => onChange({ city: e.target.value })}
        placeholder="np. Warszawa"
      />

      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-3">
          Dostępność treningowa
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
                    ? { border: '1px solid #7C3AED', background: 'rgba(124,58,237,0.1)', color: '#7C3AED' }
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

export function Step3PhotoOnly({ data, onChange }: StepProps) {
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState('');

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Plik musi być mniejszy niż 5MB');
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
      setError('Błąd przesyłania. Spróbuj ponownie.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {data.avatarUrl ? (
        <div className="flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.avatarUrl}
            alt="Zdjęcie profilowe"
            className="w-32 h-32 object-cover border-2 border-[#7C3AED]"
            style={{ borderRadius: 16 }}
          />
          <p className="text-sm text-[#00CC44]">Zdjęcie przesłane!</p>
        </div>
      ) : (
        <div
          className="w-32 h-32 bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center"
          style={{ borderRadius: 16 }}
        >
          <span className="font-display text-4xl text-[#7C3AED]">
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
          <div className="w-full py-3 bg-[var(--bg-elevated)] border border-[var(--border)] text-center text-sm text-white hover:border-[#7C3AED] transition-all cursor-pointer uppercase tracking-wider font-semibold">
            {uploading ? 'Przesyłanie...' : 'Wybierz zdjęcie'}
          </div>
        </label>
        <p className="text-xs text-[#888888] text-center">
          Wgraj wyraźne zdjęcie siebie. Maks. 5MB. JPEG, PNG, WebP.
        </p>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      <p className="text-xs text-[#555555] text-center">
        Zdjęcie jest opcjonalne — możesz je dodać później w ustawieniach profilu.
      </p>
    </div>
  );
}

// Per-sport section component
function SportProfileSection({
  sport,
  profile,
  onUpdate,
}: {
  sport: string;
  profile: SportProfileData;
  onUpdate: (updates: SportProfileData) => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const color = getSportColor(sport);
  const showFtp = FTP_SPORTS.includes(sport);
  const showVo2max = VO2MAX_SPORTS.includes(sport);

  return (
    <div
      className="border p-4 flex flex-col gap-4"
      style={{ borderColor: `${color}40`, background: `${color}08` }}
    >
      <div className="flex items-center gap-2">
        <span className="font-bold text-sm" style={{ color }}>
          {getSportLabel(sport).toUpperCase()}
        </span>
        <div className="h-px flex-1" style={{ background: `${color}30` }} />
      </div>

      {/* Core fields — always visible */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PaceInput
          label="Average Speed / Pace"
          valueSec={profile.pacePerKmSec ?? null}
          onChange={(sec) =>
            onUpdate({ ...profile, pacePerKmSec: sec, avgSpeedKmh: Math.round((3600 / sec) * 10) / 10 })
          }
        />

        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-2">
            Weekly Distance (km)
          </label>
          <input
            type="number"
            placeholder="e.g. 80"
            min="0"
            max="2000"
            value={profile.weeklyKm ?? ''}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              onUpdate({ ...profile, weeklyKm: isNaN(v) ? undefined : v });
            }}
            className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2 text-sm focus:border-[#7C3AED] focus:outline-none"
          />
        </div>
      </div>

      {/* Advanced toggle — on mobile hidden behind button */}
      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="text-xs text-[#888888] hover:text-white transition-colors text-left flex items-center gap-1 md:hidden"
      >
        {showAdvanced ? 'Hide advanced ▴' : 'Show advanced ▾'}
      </button>

      {/* Advanced fields */}
      <div className={`flex flex-col gap-4 ${showAdvanced ? '' : 'hidden md:flex'}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-2">
              Weekly Hours
            </label>
            <input
              type="number"
              placeholder="e.g. 8"
              min="0"
              max="40"
              step="0.5"
              value={profile.weeklyHours ?? ''}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                onUpdate({ ...profile, weeklyHours: isNaN(v) ? undefined : v });
              }}
              className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2 text-sm focus:border-[#7C3AED] focus:outline-none"
            />
          </div>

          {showFtp && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-2">
                FTP (Watts)
                <span
                  className="ml-1 text-[#555555] cursor-help"
                  title="Functional Threshold Power — the maximum power output you can sustain for ~1 hour"
                >
                  ⓘ
                </span>
              </label>
              <input
                type="number"
                placeholder="e.g. 250"
                min="50"
                max="600"
                value={profile.ftpWatts ?? ''}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  onUpdate({ ...profile, ftpWatts: isNaN(v) ? undefined : v });
                }}
                className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2 text-sm focus:border-[#7C3AED] focus:outline-none"
              />
            </div>
          )}

          {showVo2max && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-2">
                VO2max (ml/kg/min) <span className="text-[#555555]">(optional)</span>
              </label>
              <input
                type="number"
                placeholder="e.g. 55"
                min="20"
                max="90"
                step="0.1"
                value={profile.vo2max ?? ''}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  onUpdate({ ...profile, vo2max: isNaN(v) ? undefined : v });
                }}
                className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2 text-sm focus:border-[#7C3AED] focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Heart rate */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-2">
              Resting HR (bpm) <span className="text-[#555555]">(optional)</span>
            </label>
            <input
              type="number"
              placeholder="e.g. 50"
              min="30"
              max="100"
              value={profile.restingHr ?? ''}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                onUpdate({ ...profile, restingHr: isNaN(v) ? undefined : v });
              }}
              className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2 text-sm focus:border-[#7C3AED] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-2">
              Max HR (bpm) <span className="text-[#555555]">(optional)</span>
            </label>
            <input
              type="number"
              placeholder="e.g. 185"
              min="100"
              max="220"
              value={profile.maxHr ?? ''}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                onUpdate({ ...profile, maxHr: isNaN(v) ? undefined : v });
              }}
              className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2 text-sm focus:border-[#7C3AED] focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function Step2Performance({ data, onChange }: StepProps) {
  const enduranceSports = data.sportTypes.filter((s) => ENDURANCE_SPORT_VALUES.includes(s));

  function updateSportProfile(sport: string, updates: SportProfileData) {
    onChange({
      sportProfiles: {
        ...data.sportProfiles,
        [sport]: updates,
      },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Athlete level */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-3">
          Athlete Level
        </label>
        <div className="grid grid-cols-2 gap-2">
          {ATHLETE_LEVELS.map((level) => {
            const isSelected = data.athleteLevel === level.value;
            return (
              <button
                key={level.value}
                type="button"
                onClick={() => onChange({ athleteLevel: level.value })}
                className="p-3 border text-left transition-all"
                style={
                  isSelected
                    ? { borderColor: level.color, background: `${level.color}20`, color: level.color }
                    : { borderColor: '#2A2A2A', background: 'transparent', color: '#888888' }
                }
              >
                <div className="text-sm font-bold">{level.label}</div>
                <div className="text-xs opacity-70 mt-0.5">{level.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Years of experience */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-3">
          Years of Experience
        </label>
        <div className="flex flex-wrap gap-2">
          {YEARS_EXPERIENCE.map((yr) => {
            const currentYears = data.sportProfiles['_global']?.yearsExperience;
            const isSelected = currentYears === yr.value;
            return (
              <button
                key={yr.value}
                type="button"
                onClick={() =>
                  onChange({
                    sportProfiles: {
                      ...data.sportProfiles,
                      _global: { ...(data.sportProfiles['_global'] ?? {}), yearsExperience: yr.value },
                    },
                  })
                }
                className="px-4 py-2 border text-sm font-medium transition-all"
                style={
                  isSelected
                    ? { borderColor: '#7C3AED', background: 'rgba(124,58,237,0.1)', color: '#7C3AED' }
                    : { borderColor: '#2A2A2A', background: 'transparent', color: '#888888' }
                }
              >
                {yr.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Per-sport sections */}
      {enduranceSports.length > 0 && (
        <div className="flex flex-col gap-4">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#888888]">
            Sport-specific Performance
          </label>
          {enduranceSports.map((sport) => (
            <SportProfileSection
              key={sport}
              sport={sport}
              profile={data.sportProfiles[sport] ?? {}}
              onUpdate={(updates) => updateSportProfile(sport, updates)}
            />
          ))}
        </div>
      )}

      {enduranceSports.length === 0 && (
        <div className="p-4 border border-[var(--border)] text-[#888888] text-sm text-center">
          Select endurance sports in step 1 to configure performance profiles
        </div>
      )}
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
            className="flex-1 bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2.5 text-sm focus:border-[#7C3AED] focus:outline-none placeholder:text-[#444444]"
            step="any"
          />
          <input
            type="number"
            placeholder="Longitude"
            value={data.lon}
            onChange={(e) => onChange({ lon: e.target.value })}
            className="flex-1 bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2.5 text-sm focus:border-[#7C3AED] focus:outline-none placeholder:text-[#444444]"
            step="any"
          />
          <button
            type="button"
            onClick={detectLocation}
            className="px-4 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border)] text-[#888888] hover:text-white hover:border-[#7C3AED] text-sm transition-all"
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
                    ? { border: '1px solid #7C3AED', background: 'rgba(124,58,237,0.1)', color: '#7C3AED' }
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
        <p className="text-xs text-[#7C3AED] uppercase tracking-wider font-bold mb-4">
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
                    ? { border: '1px solid #7C3AED', background: 'rgba(124,58,237,0.1)', color: '#7C3AED' }
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
              className="w-32 h-32 object-cover border-2 border-[#7C3AED]"
            />
            <p className="text-sm text-[#00CC44]">Photo uploaded!</p>
          </div>
        ) : (
          <div className="w-32 h-32 bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center">
            <span className="font-display text-4xl text-[#7C3AED]">
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
            <div className="w-full py-3 bg-[var(--bg-elevated)] border border-[var(--border)] text-center text-sm text-white hover:border-[#7C3AED] transition-all cursor-pointer uppercase tracking-wider font-semibold">
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
                    ? { borderColor: '#7C3AED', background: 'rgba(124,58,237,0.1)', color: '#7C3AED' }
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

// ─── Step 5: Integrations (optional, skippable) ───────────────────────────────
export function Step5Integrations() {
  const [stravaLoading, setStravaLoading] = useState(false);

  function handleStrava() {
    setStravaLoading(true);
    window.location.href = '/api/strava/connect';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>
        Połącz swoje konto z Strava lub Garmin Connect, żeby automatycznie zaimportować
        dane treningowe i zweryfikować swoje wyniki. Ten krok jest opcjonalny.
      </p>

      {/* Strava */}
      <button
        onClick={handleStrava}
        disabled={stravaLoading}
        style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '16px 20px', borderRadius: 20,
          background: stravaLoading ? 'rgba(252,76,2,0.3)' : '#FC4C02',
          border: 'none', cursor: stravaLoading ? 'not-allowed' : 'pointer',
          width: '100%', textAlign: 'left',
          transition: 'all 0.2s',
        }}
      >
        <svg viewBox="0 0 24 24" style={{ width: 28, height: 28, fill: 'white', flexShrink: 0 }}>
          <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
        </svg>
        <div>
          <div style={{ color: 'white', fontWeight: 700, fontSize: 15, marginBottom: 2 }}>
            {stravaLoading ? 'Przekierowanie...' : 'Połącz ze Strava'}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
            Automatycznie importuj aktywności · zweryfikuj tempo
          </div>
        </div>
      </button>

      {/* Garmin */}
      <a
        href="/profile/import"
        style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '16px 20px', borderRadius: 20,
          background: 'rgba(0,155,255,0.1)',
          border: '1px solid rgba(0,155,255,0.3)',
          textDecoration: 'none',
          width: '100%', boxSizing: 'border-box',
          transition: 'all 0.2s',
        }}
      >
        <div style={{
          width: 28, height: 28, borderRadius: 14,
          background: '#009BFF',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, fontSize: 14, fontWeight: 900, color: 'white',
        }}>G</div>
        <div>
          <div style={{ color: 'white', fontWeight: 700, fontSize: 15, marginBottom: 2 }}>
            Połącz z Garmin
          </div>
          <div style={{ color: '#777', fontSize: 12 }}>
            Importuj dane przez link profilu lub ciasteczka sesji
          </div>
        </div>
      </a>

      <div style={{
        textAlign: 'center', color: '#444', fontSize: 12,
        paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        Możesz to pominąć i połączyć konto później w ustawieniach profilu
      </div>
    </div>
  );
}
