'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Plus, Repeat, Calendar, X, Lock, Globe, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { SPORTS, getSportColor, GYM_SPORTS } from '@/lib/utils';
import { SeriesForm, DEFAULT_SERIES_FORM, type SeriesFormData } from '@/components/sessions/series-form';
import { useLang } from '@/lib/lang';

const CYCLING_SPORTS = ['cycling', 'gravel', 'mtb', 'duathlon', 'triathlon'];
const RUNNING_SPORTS = ['running', 'trail_running'];

interface Stop {
  name: string;
  location: string;
}

interface FormData {
  title: string;
  sportType: string;
  date: string;
  time: string;
  location: string;
  lat: string;
  lon: string;
  maxParticipants: string;
  description: string;
  gpxUrl: string;
  gymName: string;
  workoutType: string;
  strengthLevelRequired: string;
  equipmentNeeded: string[];
  // Cycling/Running shared fields
  estimatedDistanceKm: string;
  estimatedDurationMin: string;
  elevationGainM: string;
  stops: Stop[];
  privacy: string;
  // Cycling specific
  targetAvgPowerWatts: string;
  // Running specific
  targetPaceSecPerKm: string;
  terrain: string; // 'road' | 'trail' | 'track' | ''
}

const EQUIPMENT_OPTIONS: { value: string; key: 'equip_barbell' | 'equip_dumbbells' | 'equip_cables' | 'equip_squat_rack' | 'equip_bench' | 'equip_pull_up_bar' | 'equip_kettlebell' | 'equip_resistance_bands' | 'equip_no_equipment' }[] = [
  { value: 'barbell', key: 'equip_barbell' },
  { value: 'dumbbells', key: 'equip_dumbbells' },
  { value: 'cables', key: 'equip_cables' },
  { value: 'squat_rack', key: 'equip_squat_rack' },
  { value: 'bench', key: 'equip_bench' },
  { value: 'pull_up_bar', key: 'equip_pull_up_bar' },
  { value: 'kettlebell', key: 'equip_kettlebell' },
  { value: 'resistance_bands', key: 'equip_resistance_bands' },
  { value: 'no_equipment', key: 'equip_no_equipment' },
];

const WORKOUT_TYPES: { value: string; key: 'wtype_push' | 'wtype_pull' | 'wtype_legs' | 'wtype_full_body' | 'wtype_upper' | 'wtype_lower' | 'wtype_custom' }[] = [
  { value: 'push', key: 'wtype_push' },
  { value: 'pull', key: 'wtype_pull' },
  { value: 'legs', key: 'wtype_legs' },
  { value: 'full_body', key: 'wtype_full_body' },
  { value: 'upper', key: 'wtype_upper' },
  { value: 'lower', key: 'wtype_lower' },
  { value: 'custom', key: 'wtype_custom' },
];
const STRENGTH_LEVELS = ['beginner', 'intermediate', 'advanced', 'elite'];

type SessionMode = 'one-time' | 'recurring';

export default function NewSessionPage() {
  const router = useRouter();
  const { t } = useLang();
  const STRENGTH_LEVELS_LABELS: Record<string, string> = {
    beginner: t('nsess_level_beginner'),
    intermediate: t('nsess_level_intermediate'),
    advanced: t('nsess_level_advanced'),
    elite: t('nsess_level_elite'),
  };
  const [mode, setMode] = useState<SessionMode>('one-time');
  const [form, setForm] = useState<FormData>({
    title: '',
    sportType: '',
    date: '',
    time: '',
    location: '',
    lat: '',
    lon: '',
    maxParticipants: '10',
    description: '',
    gpxUrl: '',
    gymName: '',
    workoutType: '',
    strengthLevelRequired: '',
    equipmentNeeded: [],
    estimatedDistanceKm: '',
    estimatedDurationMin: '',
    targetAvgPowerWatts: '',
    elevationGainM: '',
    stops: [],
    privacy: 'public',
    targetPaceSecPerKm: '',
    terrain: '',
  });
  const [seriesForm, setSeriesForm] = useState<SeriesFormData>(DEFAULT_SERIES_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [gpxUploading, setGpxUploading] = useState(false);
  const [error, setError] = useState('');

  const isGymSport = GYM_SPORTS.includes(form.sportType);
  const isCyclingSport = CYCLING_SPORTS.includes(form.sportType);
  const isRunningSport = RUNNING_SPORTS.includes(form.sportType);

  function handleChange(field: keyof FormData, value: string | string[]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function addStop() {
    setForm((prev) => ({ ...prev, stops: [...prev.stops, { name: '', location: '' }] }));
  }

  function updateStop(index: number, field: 'name' | 'location', value: string) {
    setForm((prev) => {
      const stops = [...prev.stops];
      stops[index] = { ...stops[index], [field]: value };
      return { ...prev, stops };
    });
  }

  function removeStop(index: number) {
    setForm((prev) => ({ ...prev, stops: prev.stops.filter((_, i) => i !== index) }));
  }

  function toggleEquipment(item: string) {
    setForm((prev) => ({
      ...prev,
      equipmentNeeded: prev.equipmentNeeded.includes(item)
        ? prev.equipmentNeeded.filter((e) => e !== item)
        : [...prev.equipmentNeeded, item],
    }));
  }

  async function handleGpxUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setGpxUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload/gpx', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('GPX upload failed');
      const { url } = await res.json() as { url: string };
      handleChange('gpxUrl', url);
    } catch {
      setError(t('nsess_err_gpx'));
    } finally {
      setGpxUploading(false);
    }
  }

  async function handleSubmitOneTime(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.sportType || !form.date || !form.time || !form.location) {
      setError(t('nsess_err_required'));
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          sportType: form.sportType,
          date: form.date,
          time: form.time,
          location: form.location,
          lat: form.lat ? parseFloat(form.lat) : undefined,
          lon: form.lon ? parseFloat(form.lon) : undefined,
          maxParticipants: parseInt(form.maxParticipants) || 10,
          description: form.description || undefined,
          gpxUrl: form.gpxUrl || undefined,
          gymName: form.gymName || undefined,
          workoutType: form.workoutType || undefined,
          strengthLevelRequired: form.strengthLevelRequired || undefined,
          equipmentNeeded: form.equipmentNeeded.length > 0 ? form.equipmentNeeded : undefined,
          estimatedDistanceKm: form.estimatedDistanceKm ? parseFloat(form.estimatedDistanceKm) : undefined,
          estimatedDurationMin: form.estimatedDurationMin ? parseInt(form.estimatedDurationMin) : undefined,
          targetAvgPowerWatts: form.targetAvgPowerWatts ? parseInt(form.targetAvgPowerWatts) : undefined,
          elevationGainM: form.elevationGainM ? parseInt(form.elevationGainM) : undefined,
          stops: form.stops.filter((s) => s.name.trim()).length > 0 ? form.stops.filter((s) => s.name.trim()) : undefined,
          privacy: form.privacy,
          // Running
          targetPaceSecPerKm: form.targetPaceSecPerKm || undefined,
          terrain: form.terrain || undefined,
        }),
      });

      if (!res.ok) throw new Error('Failed to create session');
      const session = await res.json() as { id: number };
      router.push(`/sessions/${session.id}`);
    } catch {
      setError(t('nsess_err_create'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitSeries(e: React.FormEvent) {
    e.preventDefault();
    if (!seriesForm.title || !seriesForm.sport || !seriesForm.location || !seriesForm.startDate || !seriesForm.time) {
      setError(t('nsess_err_series_required'));
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/session-series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: seriesForm.title,
          sport: seriesForm.sport,
          dayOfWeek: seriesForm.dayOfWeek,
          time: seriesForm.time,
          frequency: seriesForm.frequency,
          location: seriesForm.location,
          lat: seriesForm.lat ? parseFloat(seriesForm.lat) : undefined,
          lon: seriesForm.lon ? parseFloat(seriesForm.lon) : undefined,
          maxParticipants: parseInt(seriesForm.maxParticipants) || 10,
          description: seriesForm.description || undefined,
          minLevel: seriesForm.minLevel || undefined,
          startDate: seriesForm.startDate,
          endDate: seriesForm.endDate || undefined,
        }),
      });

      if (!res.ok) throw new Error('Failed to create recurring series');
      router.push('/sessions/series');
    } catch {
      setError(t('nsess_err_series_create'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="font-display text-2xl md:text-3xl tracking-wider mb-6" style={{ color: 'var(--text)' }}>{t('nsess_title')}</h1>

      {/* Mode toggle */}
      <div className="flex items-center border border-[var(--border)] mb-8 w-fit">
        <button
          type="button"
          onClick={() => setMode('one-time')}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all ${
            mode === 'one-time' ? 'bg-[#6366F1] text-white' : 'text-[#888888] hover:text-white'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          {t('nsess_tab_onetime')}
        </button>
        <button
          type="button"
          onClick={() => setMode('recurring')}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all ${
            mode === 'recurring' ? 'bg-[#6366F1] text-white' : 'text-[#888888] hover:text-white'
          }`}
        >
          <Repeat className="w-3.5 h-3.5" />
          {t('nsess_tab_recurring')}
        </button>
      </div>

      {/* One-time session form */}
      {mode === 'one-time' && (
        <form onSubmit={handleSubmitOneTime} className="flex flex-col gap-6">
          {/* Sport type */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-3">
              {t('nsess_sport_type')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
              {SPORTS.slice(0, 8).map((sport) => {
                const color = getSportColor(sport.value);
                const isSelected = form.sportType === sport.value;
                return (
                  <button
                    key={sport.value}
                    type="button"
                    onClick={() => handleChange('sportType', sport.value)}
                    className="p-3 border text-sm font-medium transition-all"
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
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {SPORTS.slice(8).map((sport) => {
                const color = getSportColor(sport.value);
                const isSelected = form.sportType === sport.value;
                return (
                  <button
                    key={sport.value}
                    type="button"
                    onClick={() => handleChange('sportType', sport.value)}
                    className="p-2 border text-xs font-medium transition-all"
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
          </div>

          <Input
            label={t('nsess_session_title')}
            value={form.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder={t('nsess_session_title_ph')}
          />

          <Textarea
            label={t('nsess_description')}
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder={t('nsess_description_ph')}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('nsess_date')}
              type="date"
              value={form.date}
              onChange={(e) => handleChange('date', e.target.value)}
            />
            <Input
              label={t('nsess_start_time')}
              type="time"
              value={form.time}
              onChange={(e) => handleChange('time', e.target.value)}
            />
          </div>

          <Input
            label={t('nsess_meeting_point')}
            value={form.location}
            onChange={(e) => handleChange('location', e.target.value)}
            placeholder={t('nsess_meeting_point_ph')}
          />

          {/* Gym-specific fields */}
          {isGymSport && (
            <div className="border-t border-[var(--border)] pt-4">
              <p className="text-xs font-bold text-[#6366F1] uppercase tracking-wider mb-4">{t('nsess_gym_settings')}</p>

              <div className="flex flex-col gap-4">
                <Input
                  label={t('nsess_gym_name')}
                  value={form.gymName}
                  onChange={(e) => handleChange('gymName', e.target.value)}
                  placeholder={t('nsess_gym_name_ph')}
                />

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-2">
                    {t('nsess_workout_type')}
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {WORKOUT_TYPES.map((wt) => (
                      <button
                        key={wt.value}
                        type="button"
                        onClick={() => handleChange('workoutType', form.workoutType === wt.value ? '' : wt.value)}
                        className="p-2 border text-xs font-medium capitalize transition-all"
                        style={
                          form.workoutType === wt.value
                            ? { borderColor: '#6366F1', background: 'rgba(99,102,241,0.1)', color: '#6366F1' }
                            : { borderColor: '#2A2A2A', background: 'transparent', color: '#888888' }
                        }
                      >
                        {t(wt.key)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-2">
                    {t('nsess_min_level')}
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {STRENGTH_LEVELS.map((level) => {
                      const colors: Record<string, string> = {
                        beginner: '#00CC44', intermediate: '#FFD700',
                        advanced: '#A78BFA', elite: '#6366F1',
                      };
                      const color = colors[level];
                      return (
                        <button
                          key={level}
                          type="button"
                          onClick={() => handleChange('strengthLevelRequired', form.strengthLevelRequired === level ? '' : level)}
                          className="p-2 border text-xs font-medium transition-all"
                          style={
                            form.strengthLevelRequired === level
                              ? { borderColor: color, background: `${color}20`, color }
                              : { borderColor: '#2A2A2A', background: 'transparent', color: '#888888' }
                          }
                        >
                          {STRENGTH_LEVELS_LABELS[level] ?? level}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-2">
                    {t('nsess_equipment')}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {EQUIPMENT_OPTIONS.map((eq) => {
                      const isSelected = form.equipmentNeeded.includes(eq.value);
                      return (
                        <button
                          key={eq.value}
                          type="button"
                          onClick={() => toggleEquipment(eq.value)}
                          className="p-2 border text-xs font-medium transition-all"
                          style={
                            isSelected
                              ? { borderColor: '#6366F1', background: 'rgba(99,102,241,0.1)', color: '#6366F1' }
                              : { borderColor: '#2A2A2A', background: 'transparent', color: '#888888' }
                          }
                        >
                          {t(eq.key)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cycling-specific fields */}
          {isCyclingSport && (
            <div className="border-t border-[var(--border)] pt-4">
              <p className="text-xs font-bold text-[#6366F1] uppercase tracking-wider mb-4">🚴 {t('nsess_cycling_details')}</p>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label={t('nsess_est_distance')}
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.estimatedDistanceKm}
                    onChange={(e) => handleChange('estimatedDistanceKm', e.target.value)}
                    placeholder="np. 80"
                  />
                  <Input
                    label={t('nsess_est_duration')}
                    type="number"
                    min="0"
                    value={form.estimatedDurationMin}
                    onChange={(e) => handleChange('estimatedDurationMin', e.target.value)}
                    placeholder="np. 180"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label={t('nsess_target_power')}
                    type="number"
                    min="0"
                    value={form.targetAvgPowerWatts}
                    onChange={(e) => handleChange('targetAvgPowerWatts', e.target.value)}
                    placeholder="np. 200"
                  />
                  <Input
                    label={t('nsess_elevation')}
                    type="number"
                    min="0"
                    value={form.elevationGainM}
                    onChange={(e) => handleChange('elevationGainM', e.target.value)}
                    placeholder="np. 1200"
                  />
                </div>

                {/* Stops */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-2">
                    {t('nsess_stops')}
                  </label>
                  <div className="flex flex-col gap-2 mb-2">
                    {form.stops.map((stop, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <span className="text-xs text-[#6366F1] font-bold w-4 shrink-0">{i + 1}.</span>
                        <input
                          type="text"
                          placeholder={t('nsess_stop_name_ph')}
                          value={stop.name}
                          onChange={(e) => updateStop(i, 'name', e.target.value)}
                          className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text)] text-sm px-3 py-2 rounded-xl focus:outline-none focus:border-[#6366F1]"
                        />
                        <input
                          type="text"
                          placeholder={t('nsess_stop_location_ph')}
                          value={stop.location}
                          onChange={(e) => updateStop(i, 'location', e.target.value)}
                          className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text)] text-sm px-3 py-2 rounded-xl focus:outline-none focus:border-[#6366F1]"
                        />
                        <button type="button" onClick={() => removeStop(i)} className="shrink-0 text-[#888] hover:text-red-400 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addStop}
                    className="flex items-center gap-2 text-xs font-semibold text-[#6366F1] hover:text-[#818CF8] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t('nsess_add_stop')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Running-specific fields */}
          {isRunningSport && (
            <div className="border-t border-[var(--border)] pt-4">
              <p className="text-xs font-bold text-[#6366F1] uppercase tracking-wider mb-4">🏃 {t('nsess_running_details')}</p>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label={t('nsess_distance')}
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.estimatedDistanceKm}
                    onChange={(e) => handleChange('estimatedDistanceKm', e.target.value)}
                    placeholder="np. 10"
                  />
                  <Input
                    label={t('nsess_est_time_short')}
                    type="number"
                    min="0"
                    value={form.estimatedDurationMin}
                    onChange={(e) => handleChange('estimatedDurationMin', e.target.value)}
                    placeholder="np. 60"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label={t('nsess_target_pace')}
                    type="text"
                    value={form.targetPaceSecPerKm}
                    onChange={(e) => handleChange('targetPaceSecPerKm', e.target.value)}
                    placeholder="np. 5:30"
                  />
                  <Input
                    label={t('nsess_elevation')}
                    type="number"
                    min="0"
                    value={form.elevationGainM}
                    onChange={(e) => handleChange('elevationGainM', e.target.value)}
                    placeholder="np. 300"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-2">
                    {t('nsess_terrain')}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'road', label: `🛣️ ${t('nsess_terrain_road')}` },
                      { value: 'trail', label: `🌿 ${t('nsess_terrain_trail')}` },
                      { value: 'track', label: `🏟️ ${t('nsess_terrain_track')}` },
                    ].map((ter) => {
                      const isSelected = form.terrain === ter.value;
                      return (
                        <button
                          key={ter.value}
                          type="button"
                          onClick={() => handleChange('terrain', form.terrain === ter.value ? '' : ter.value)}
                          className="p-2.5 border text-sm font-medium transition-all rounded-xl"
                          style={
                            isSelected
                              ? { borderColor: '#6366F1', background: 'rgba(99,102,241,0.1)', color: '#6366F1' }
                              : { borderColor: 'var(--border)', background: 'transparent', color: 'var(--text-muted)' }
                          }
                        >
                          {ter.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Privacy */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-2">
              {t('nsess_privacy')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'public', label: t('nsess_privacy_public'), sublabel: t('nsess_privacy_public_sub'), icon: Globe },
                { value: 'friends', label: t('nsess_privacy_friends'), sublabel: t('nsess_privacy_friends_sub'), icon: Users },
              ].map(({ value, label, sublabel, icon: Icon }) => {
                const isSelected = form.privacy === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleChange('privacy', value)}
                    className="p-3 border text-left transition-all rounded-xl"
                    style={
                      isSelected
                        ? { borderColor: '#6366F1', background: 'rgba(99,102,241,0.1)', color: '#6366F1' }
                        : { borderColor: 'var(--border)', background: 'transparent', color: 'var(--text-muted)' }
                    }
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-semibold">{label}</span>
                      {isSelected && <Lock className="w-3 h-3 ml-auto" />}
                    </div>
                    <p className="text-xs opacity-70">{sublabel}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('nsess_lat')}
              type="number"
              step="any"
              value={form.lat}
              onChange={(e) => handleChange('lat', e.target.value)}
              placeholder="52.2297"
            />
            <Input
              label={t('nsess_lon')}
              type="number"
              step="any"
              value={form.lon}
              onChange={(e) => handleChange('lon', e.target.value)}
              placeholder="21.0122"
            />
          </div>

          <Input
            label={t('nsess_max_participants')}
            type="number"
            min="2"
            max="100"
            value={form.maxParticipants}
            onChange={(e) => handleChange('maxParticipants', e.target.value)}
          />

          {!isGymSport && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-3">
                {t('nsess_gpx_label')}
              </label>
              {form.gpxUrl ? (
                <div className="flex items-center gap-3 p-3 bg-[var(--bg-card)] border border-[#00CC44]">
                  <Upload className="w-4 h-4 text-[#00CC44]" />
                  <span className="text-sm text-[#00CC44]">{t('nsess_gpx_uploaded')}</span>
                  <button
                    type="button"
                    onClick={() => handleChange('gpxUrl', '')}
                    className="ml-auto text-[#888888] hover:text-red-400 text-xs"
                  >
                    {t('gen_remove')}
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <input type="file" accept=".gpx" onChange={handleGpxUpload} className="hidden" />
                  <div className="flex items-center gap-3 p-3 border border-dashed border-[var(--border)] text-[#888888] hover:border-[#6366F1] hover:text-white transition-all">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">
                      {gpxUploading ? t('nsess_gpx_uploading') : t('nsess_gpx_upload_cta')}
                    </span>
                  </div>
                </label>
              )}
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400 bg-red-900/20 border border-red-900 p-3">{error}</p>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={submitting}
            >
              {t('gen_cancel')}
            </Button>
            <Button type="submit" loading={submitting} className="flex-1">
              <Plus className="w-4 h-4" />
              {t('nsess_create_session')}
            </Button>
          </div>
        </form>
      )}

      {/* Recurring series form */}
      {mode === 'recurring' && (
        <form onSubmit={handleSubmitSeries} className="flex flex-col gap-6">
          <div className="border border-[#6366F1]/20 bg-[#6366F1]/5 p-3">
            <p className="text-xs text-[#A78BFA]">
              {t('nsess_series_info')}
            </p>
          </div>

          <SeriesForm form={seriesForm} onChange={setSeriesForm} />

          {error && (
            <p className="text-sm text-red-400 bg-red-900/20 border border-red-900 p-3">{error}</p>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={submitting}
            >
              {t('gen_cancel')}
            </Button>
            <Button type="submit" loading={submitting} className="flex-1">
              <Repeat className="w-4 h-4" />
              {t('nsess_create_series')}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
