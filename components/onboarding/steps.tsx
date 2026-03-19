'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Input, Textarea } from '@/components/ui/input';
import { SPORTS, getSportColor, GYM_SPORTS, getSportLabel } from '@/lib/utils';
import { PaceInput } from '@/components/ui/pace-input';
import { useLang, type TKey } from '@/lib/lang';

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

type TFn = (key: TKey, vars?: Record<string, string>) => string;

const AVAILABILITY_KEYS: { value: string; labelKey: TKey }[] = [
  { value: 'Wczesny ranek (5-8)', labelKey: 'onb_avail_early_morning' },
  { value: 'Ranek (8-11)', labelKey: 'onb_avail_morning' },
  { value: 'Południe (11-14)', labelKey: 'onb_avail_noon' },
  { value: 'Popołudnie (14-17)', labelKey: 'onb_avail_afternoon' },
  { value: 'Wieczór (17-20)', labelKey: 'onb_avail_evening' },
  { value: 'Noc (20+)', labelKey: 'onb_avail_night' },
  { value: 'Dni powszednie', labelKey: 'onb_avail_weekdays' },
  { value: 'Weekendy', labelKey: 'onb_avail_weekends' },
];

function getStrengthLevels(t: TFn) {
  return [
    { value: 'beginner', label: t('onb_level_beginner'), color: '#00CC44' },
    { value: 'intermediate', label: t('onb_level_intermediate'), color: '#FFD700' },
    { value: 'advanced', label: t('onb_level_advanced'), color: '#A78BFA' },
    { value: 'elite', label: t('onb_level_elite'), color: '#6366F1' },
  ];
}

function getAthleteLevels(t: TFn) {
  return [
    { value: 'beginner', label: t('onb_athlete_beginner'), desc: t('onb_athlete_beginner_desc'), color: '#00CC44' },
    { value: 'recreational', label: t('onb_athlete_recreational'), desc: t('onb_athlete_recreational_desc'), color: '#FFD700' },
    { value: 'competitive', label: t('onb_athlete_competitive'), desc: t('onb_athlete_competitive_desc'), color: '#A78BFA' },
    { value: 'elite', label: t('onb_athlete_elite'), desc: t('onb_athlete_elite_desc'), color: '#6366F1' },
  ];
}

function getYearsExperience(t: TFn) {
  return [
    { value: 0, label: t('onb_exp_less_1') },
    { value: 1, label: t('onb_exp_1') },
    { value: 2, label: t('onb_exp_2_3') },
    { value: 4, label: t('onb_exp_4_5') },
    { value: 6, label: t('onb_exp_5_plus') },
  ];
}

function getTrainingSplits(t: TFn) {
  return [
    { value: 'push_pull_legs', label: t('onb_split_ppl') },
    { value: 'full_body', label: t('onb_split_full_body') },
    { value: 'upper_lower', label: t('onb_split_upper_lower') },
    { value: 'bro_split', label: t('onb_split_bro') },
    { value: 'powerlifting', label: t('onb_split_powerlifting') },
  ];
}

function getGoalOptions(t: TFn) {
  return [
    { value: 'strength', label: t('onb_goal_strength'), emoji: '\u{1F4AA}' },
    { value: 'hypertrophy', label: t('onb_goal_hypertrophy'), emoji: '\u{1F3CB}\uFE0F' },
    { value: 'endurance', label: t('onb_goal_endurance'), emoji: '\u{1F3C3}' },
    { value: 'weight_loss', label: t('onb_goal_weight_loss'), emoji: '\u26A1' },
    { value: 'athletic', label: t('onb_goal_athletic'), emoji: '\u{1F3AF}' },
  ];
}

function getGenderOptions(t: TFn) {
  return [
    { value: 'male', label: t('onb_gender_male') },
    { value: 'female', label: t('onb_gender_female') },
    { value: 'other', label: t('onb_gender_other') },
  ];
}

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

export function Step1SportsBio({ data, onChange }: StepProps) {
  const { t } = useLang();

  const GENDER_OPTIONS = getGenderOptions(t);

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
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)] block mb-1">
          {t('onb_endurance_sports')}
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
                aria-pressed={isSelected}
                className="p-3 border text-sm font-medium transition-all text-left"
                style={
                  isSelected
                    ? { border: `1px solid ${color}`, background: `${color}20`, color }
                    : { border: '1px solid #2A2A2A', background: 'transparent', color: 'var(--text-dim)' }
                }
              >
                {sport.label}
              </button>
            );
          })}
        </div>

        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)] block mb-1">
          {t('onb_gym')}
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
                aria-pressed={isSelected}
                className="p-3 border text-sm font-medium transition-all text-left"
                style={
                  isSelected
                    ? { border: `1px solid ${color}`, background: `${color}20`, color }
                    : { border: '1px solid #2A2A2A', background: 'transparent', color: 'var(--text-dim)' }
                }
              >
                {sport.label}
              </button>
            );
          })}
        </div>

        {data.sportTypes.length === 0 && (
          <p className="text-xs text-red-400 mt-2">{t('onb_select_sport')}</p>
        )}
      </div>

      <Input
        label={t('onb_display_name')}
        value={data.username}
        onChange={(e) => onChange({ username: e.target.value })}
        placeholder={t('onb_display_name_ph')}
      />

      <Textarea
        label={t('onb_bio_label')}
        value={data.bio}
        onChange={(e) => onChange({ bio: e.target.value })}
        placeholder={t('onb_bio_placeholder')}
        className="min-h-[100px]"
      />

      {/* Age */}
      <div>
        <label htmlFor="onboarding-age" className="text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)] block mb-2">
          {t('onb_age')}
        </label>
        <input
          id="onboarding-age"
          type="number"
          placeholder={t('onb_age_placeholder')}
          min="13"
          max="100"
          value={data.age}
          onChange={(e) => onChange({ age: e.target.value })}
          className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2.5 text-sm focus:border-[#6366F1] focus:outline-none placeholder:text-[#444444]"
        />
      </div>

      {/* Gender */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)] block mb-2">
          {t('onb_gender')}
        </label>
        <div className="flex gap-2">
          {GENDER_OPTIONS.map((opt) => {
            const isSelected = data.gender === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ gender: opt.value })}
                aria-pressed={isSelected}
                className="flex-1 py-2.5 border text-sm font-medium transition-all"
                style={
                  isSelected
                    ? { borderColor: '#6366F1', background: 'rgba(99,102,241,0.1)', color: '#6366F1' }
                    : { borderColor: '#2A2A2A', background: 'transparent', color: 'var(--text-dim)' }
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
          <label htmlFor="onboarding-weight" className="text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)] block mb-2">
            {t('onb_weight')}
          </label>
          <input
            id="onboarding-weight"
            type="number"
            placeholder={t('onb_weight_placeholder')}
            min="30"
            max="200"
            step="0.5"
            value={data.weightKg}
            onChange={(e) => onChange({ weightKg: e.target.value })}
            className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2.5 text-sm focus:border-[#6366F1] focus:outline-none placeholder:text-[#444444]"
          />
        </div>
      )}
    </div>
  );
}

export function Step2LocationAvailability({ data, onChange }: StepProps) {
  const { t } = useLang();

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
        label={t('onb_city_label')}
        value={data.city}
        onChange={(e) => onChange({ city: e.target.value })}
        placeholder={t('onb_city_placeholder')}
      />

      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)] block mb-3">
          {t('onb_availability')}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {AVAILABILITY_KEYS.map((slot) => {
            const isSelected = data.availability.includes(slot.value);
            return (
              <button
                key={slot.value}
                type="button"
                onClick={() => toggleAvailability(slot.value)}
                aria-pressed={isSelected}
                className="p-2.5 border text-xs font-medium text-left transition-all"
                style={
                  isSelected
                    ? { border: '1px solid #6366F1', background: 'rgba(99,102,241,0.1)', color: '#6366F1' }
                    : { border: '1px solid #2A2A2A', background: 'transparent', color: 'var(--text-dim)' }
                }
              >
                {t(slot.labelKey)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function Step3PhotoOnly({ data, onChange }: StepProps) {
  const { t } = useLang();
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState('');

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError(t('onboarding_file_too_large'));
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
      setError(t('onboarding_upload_error'));
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
            alt={t('onb_photo_alt')}
            className="w-32 h-32 object-cover border-2 border-[#6366F1]"
            style={{ borderRadius: 16 }}
          />
          <p className="text-sm text-[#00CC44]">{t('onb_photo_uploaded')}</p>
        </div>
      ) : (
        <div
          className="w-32 h-32 bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center"
          style={{ borderRadius: 16 }}
        >
          <span className="font-display text-4xl text-[#6366F1]">
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
            aria-label={t('onb_photo_select_aria')}
            className="hidden"
          />
          <div className="w-full py-3 bg-[var(--bg-elevated)] border border-[var(--border)] text-center text-sm text-white hover:border-[#6366F1] transition-all cursor-pointer uppercase tracking-wider font-semibold">
            {uploading ? t('onb_photo_uploading') : t('onb_photo_select')}
          </div>
        </label>
        <p className="text-xs text-[var(--text-dim)] text-center">
          {t('onb_photo_hint')}
        </p>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      <p className="text-xs text-[var(--text-muted)] text-center">
        {t('onb_photo_optional')}
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
  const { t } = useLang();
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
          label={t('onb_avg_pace_speed')}
          valueSec={profile.pacePerKmSec ?? null}
          onChange={(sec) =>
            onUpdate({ ...profile, pacePerKmSec: sec, avgSpeedKmh: Math.round((3600 / sec) * 10) / 10 })
          }
        />

        <div>
          <label htmlFor={`${sport}-weeklyKm`} className="text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)] block mb-2">
            {t('onb_weekly_distance')}
          </label>
          <input
            id={`${sport}-weeklyKm`}
            type="number"
            placeholder={t('onb_weekly_distance_ph')}
            min="0"
            max="2000"
            value={profile.weeklyKm ?? ''}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              onUpdate({ ...profile, weeklyKm: isNaN(v) ? undefined : v });
            }}
            className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none"
          />
        </div>
      </div>

      {/* Advanced toggle — on mobile hidden behind button */}
      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="text-xs text-[var(--text-dim)] hover:text-white transition-colors text-left flex items-center gap-1 md:hidden"
      >
        {showAdvanced ? `${t('onb_hide_advanced')} \u25B4` : `${t('onb_show_advanced')} \u25BE`}
      </button>

      {/* Advanced fields */}
      <div className={`flex flex-col gap-4 ${showAdvanced ? '' : 'hidden md:flex'}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor={`${sport}-weeklyHours`} className="text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)] block mb-2">
              {t('onb_weekly_hours')}
            </label>
            <input
              id={`${sport}-weeklyHours`}
              type="number"
              placeholder={t('onb_weekly_hours_ph')}
              min="0"
              max="40"
              step="0.5"
              value={profile.weeklyHours ?? ''}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                onUpdate({ ...profile, weeklyHours: isNaN(v) ? undefined : v });
              }}
              className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none"
            />
          </div>

          {showFtp && (
            <div>
              <label htmlFor={`${sport}-ftp`} className="text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)] block mb-2">
                FTP (Watts)
                <span
                  className="ml-1 text-[var(--text-muted)] cursor-help"
                  title={t('onb_ftp_tooltip')}
                >
                  {'\u24D8'}
                </span>
              </label>
              <input
                id={`${sport}-ftp`}
                type="number"
                placeholder={t('onb_ftp_placeholder')}
                min="50"
                max="600"
                value={profile.ftpWatts ?? ''}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  onUpdate({ ...profile, ftpWatts: isNaN(v) ? undefined : v });
                }}
                className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none"
              />
            </div>
          )}

          {showVo2max && (
            <div>
              <label htmlFor={`${sport}-vo2max`} className="text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)] block mb-2">
                VO2max (ml/kg/min) <span className="text-[var(--text-muted)]">({t('onb_vo2max_optional')})</span>
              </label>
              <input
                id={`${sport}-vo2max`}
                type="number"
                placeholder={t('onb_vo2max_placeholder')}
                min="20"
                max="90"
                step="0.1"
                value={profile.vo2max ?? ''}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  onUpdate({ ...profile, vo2max: isNaN(v) ? undefined : v });
                }}
                className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Heart rate */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor={`${sport}-restingHr`} className="text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)] block mb-2">
              {t('onb_resting_hr')} <span className="text-[var(--text-muted)]">({t('onb_vo2max_optional')})</span>
            </label>
            <input
              id={`${sport}-restingHr`}
              type="number"
              placeholder={t('onb_resting_hr_ph')}
              min="30"
              max="100"
              value={profile.restingHr ?? ''}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                onUpdate({ ...profile, restingHr: isNaN(v) ? undefined : v });
              }}
              className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor={`${sport}-maxHr`} className="text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)] block mb-2">
              {t('onb_max_hr')} <span className="text-[var(--text-muted)]">({t('onb_vo2max_optional')})</span>
            </label>
            <input
              id={`${sport}-maxHr`}
              type="number"
              placeholder={t('onb_max_hr_ph')}
              min="100"
              max="220"
              value={profile.maxHr ?? ''}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                onUpdate({ ...profile, maxHr: isNaN(v) ? undefined : v });
              }}
              className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2 text-sm focus:border-[#6366F1] focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function Step2Performance({ data, onChange }: StepProps) {
  const { t } = useLang();
  const enduranceSports = data.sportTypes.filter((s) => ENDURANCE_SPORT_VALUES.includes(s));

  const ATHLETE_LEVELS = getAthleteLevels(t);
  const YEARS_EXPERIENCE = getYearsExperience(t);

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
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)] block mb-3">
          {t('onb_athlete_level')}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {ATHLETE_LEVELS.map((level) => {
            const isSelected = data.athleteLevel === level.value;
            return (
              <button
                key={level.value}
                type="button"
                onClick={() => onChange({ athleteLevel: level.value })}
                aria-pressed={isSelected}
                className="p-3 border text-left transition-all"
                style={
                  isSelected
                    ? { borderColor: level.color, background: `${level.color}20`, color: level.color }
                    : { borderColor: '#2A2A2A', background: 'transparent', color: 'var(--text-dim)' }
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
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)] block mb-3">
          {t('onb_years_experience')}
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
                aria-pressed={isSelected}
                className="px-4 py-2 border text-sm font-medium transition-all"
                style={
                  isSelected
                    ? { borderColor: '#6366F1', background: 'rgba(99,102,241,0.1)', color: '#6366F1' }
                    : { borderColor: '#2A2A2A', background: 'transparent', color: 'var(--text-dim)' }
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
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)]">
            {t('onb_performance_params')}
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
        <div className="p-4 border border-[var(--border)] text-[var(--text-dim)] text-sm text-center">
          {t('onb_no_endurance')}
        </div>
      )}
    </div>
  );
}

export function Step3Location({ data, onChange }: StepProps) {
  const { t } = useLang();

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
        label={t('onb_city_area')}
        value={data.city}
        onChange={(e) => onChange({ city: e.target.value })}
        placeholder={t('onb_city_area_ph')}
      />

      <div>
        <label id="gps-label" className="text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)] block mb-3">
          {t('onb_gps_label')}
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder={t('onb_latitude_ph')}
            aria-label={t('onb_latitude_aria')}
            value={data.lat}
            onChange={(e) => onChange({ lat: e.target.value })}
            className="flex-1 bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2.5 text-sm focus:border-[#6366F1] focus:outline-none placeholder:text-[#444444]"
            step="any"
          />
          <input
            type="number"
            placeholder={t('onb_longitude_ph')}
            aria-label={t('onb_longitude_aria')}
            value={data.lon}
            onChange={(e) => onChange({ lon: e.target.value })}
            className="flex-1 bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2.5 text-sm focus:border-[#6366F1] focus:outline-none placeholder:text-[#444444]"
            step="any"
          />
          <button
            type="button"
            onClick={detectLocation}
            className="px-4 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-dim)] hover:text-white hover:border-[#6366F1] text-sm transition-all"
          >
            Auto
          </button>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)] block mb-3">
          {t('onb_availability')}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {AVAILABILITY_KEYS.map((slot) => {
            const isSelected = data.availability.includes(slot.value);
            return (
              <button
                key={slot.value}
                type="button"
                onClick={() => toggleAvailability(slot.value)}
                aria-pressed={isSelected}
                className="p-2.5 border text-xs font-medium text-left transition-all"
                style={
                  isSelected
                    ? { border: '1px solid #6366F1', background: 'rgba(99,102,241,0.1)', color: '#6366F1' }
                    : { border: '1px solid #2A2A2A', background: 'transparent', color: 'var(--text-dim)' }
                }
              >
                {t(slot.labelKey)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function Step3HalfGym({ data, onChange }: StepProps) {
  const { t } = useLang();

  const STRENGTH_LEVELS = getStrengthLevels(t);
  const TRAINING_SPLITS = getTrainingSplits(t);

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
        <p className="text-xs text-[#6366F1] uppercase tracking-wider font-bold mb-4">
          {t('onb_gym_config')}
        </p>

        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)] block mb-3">
          {t('onb_strength_level')}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {STRENGTH_LEVELS.map((level) => {
            const isSelected = data.strengthLevel === level.value;
            return (
              <button
                key={level.value}
                type="button"
                onClick={() => onChange({ strengthLevel: level.value })}
                aria-pressed={isSelected}
                className="p-3 border text-sm font-medium transition-all text-left"
                style={
                  isSelected
                    ? { borderColor: level.color, background: `${level.color}20`, color: level.color }
                    : { borderColor: '#2A2A2A', background: 'transparent', color: 'var(--text-dim)' }
                }
              >
                <div className="font-bold">{level.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)] block mb-3">
          {t('onb_training_plan')}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {TRAINING_SPLITS.map((split) => {
            const isSelected = (data.trainingSplits ?? []).includes(split.value);
            return (
              <button
                key={split.value}
                type="button"
                onClick={() => toggleSplit(split.value)}
                aria-pressed={isSelected}
                className="p-2.5 border text-xs font-medium transition-all text-left"
                style={
                  isSelected
                    ? { border: '1px solid #6366F1', background: 'rgba(99,102,241,0.1)', color: '#6366F1' }
                    : { border: '1px solid #2A2A2A', background: 'transparent', color: 'var(--text-dim)' }
                }
              >
                {split.label}
              </button>
            );
          })}
        </div>
      </div>

      <Input
        label={t('onb_gym_name')}
        value={data.gymName ?? ''}
        onChange={(e) => onChange({ gymName: e.target.value })}
        placeholder={t('onb_gym_name_ph')}
        hint={t('onb_gym_name_hint')}
      />
    </div>
  );
}

export function Step4Photo({ data, onChange }: StepProps) {
  const { t } = useLang();
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState('');

  const GOAL_OPTIONS = getGoalOptions(t);

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
      setError(t('onboarding_file_too_large'));
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
      setError(t('onboarding_upload_error'));
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
              alt={t('onb_photo_alt')}
              className="w-32 h-32 object-cover border-2 border-[#6366F1]"
            />
            <p className="text-sm text-[#00CC44]">{t('onb_photo_uploaded')}</p>
          </div>
        ) : (
          <div className="w-32 h-32 bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center">
            <span className="font-display text-4xl text-[#6366F1]">
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
              aria-label={t('onb_photo_select_aria')}
              className="hidden"
            />
            <div className="w-full py-3 bg-[var(--bg-elevated)] border border-[var(--border)] text-center text-sm text-white hover:border-[#6366F1] transition-all cursor-pointer uppercase tracking-wider font-semibold">
              {uploading ? t('onb_photo_uploading') : t('onb_photo_select')}
            </div>
          </label>
          <p className="text-xs text-[var(--text-dim)] text-center">
            {t('onb_photo_hint')}
          </p>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      </div>

      {/* Goals section */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)] block mb-3">
          {t('onb_goals_label')}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {GOAL_OPTIONS.map((goal) => {
            const isSelected = (data.goals ?? []).includes(goal.value);
            return (
              <button
                key={goal.value}
                type="button"
                onClick={() => toggleGoal(goal.value)}
                aria-pressed={isSelected}
                className="p-3 border text-sm font-medium transition-all flex items-center gap-2"
                style={
                  isSelected
                    ? { borderColor: '#6366F1', background: 'rgba(99,102,241,0.1)', color: '#6366F1' }
                    : { borderColor: '#2A2A2A', background: 'transparent', color: 'var(--text-dim)' }
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
  const { t } = useLang();
  const [stravaLoading, setStravaLoading] = useState(false);

  function handleStrava() {
    setStravaLoading(true);
    window.location.href = '/api/strava/connect';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>
        {t('onb_integrations_desc')}
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
            {stravaLoading ? t('onb_strava_redirect') : t('onb_strava_connect')}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
            {t('onb_strava_desc')}
          </div>
        </div>
      </button>

      {/* Garmin */}
      <Link
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
            {t('onb_garmin_connect')}
          </div>
          <div style={{ color: '#777', fontSize: 12 }}>
            {t('onb_garmin_desc')}
          </div>
        </div>
      </Link>

      <div style={{
        textAlign: 'center', color: '#444', fontSize: 12,
        paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        {t('onb_skip_integrations')}
      </div>
    </div>
  );
}
