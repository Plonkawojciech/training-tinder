'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { SPORTS, getSportColor, GYM_SPORTS } from '@/lib/utils';

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
}

const EQUIPMENT_OPTIONS = [
  'Barbell', 'Dumbbells', 'Cables', 'Squat Rack', 'Bench',
  'Pull-up Bar', 'Kettlebells', 'Resistance Bands', 'No Equipment',
];

const WORKOUT_TYPES = ['push', 'pull', 'legs', 'fullbody', 'upper', 'lower', 'custom'];
const STRENGTH_LEVELS = ['beginner', 'intermediate', 'advanced', 'elite'];

export default function NewSessionPage() {
  const router = useRouter();
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
  });
  const [submitting, setSubmitting] = useState(false);
  const [gpxUploading, setGpxUploading] = useState(false);
  const [error, setError] = useState('');

  const isGymSport = GYM_SPORTS.includes(form.sportType);

  function handleChange(field: keyof FormData, value: string | string[]) {
    setForm((prev) => ({ ...prev, [field]: value }));
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
      setError('GPX upload failed');
    } finally {
      setGpxUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.sportType || !form.date || !form.time || !form.location) {
      setError('Please fill in all required fields');
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
        }),
      });

      if (!res.ok) throw new Error('Failed to create session');
      const session = await res.json() as { id: number };
      router.push(`/sessions/${session.id}`);
    } catch {
      setError('Failed to create session. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="font-display text-3xl text-white tracking-wider mb-6">NEW SESSION</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Sport type */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-3">
            Sport Type *
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
          label="Session Title *"
          value={form.title}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="e.g. Saturday Morning Group Ride"
        />

        <Textarea
          label="Description"
          value={form.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Describe the session, route, difficulty, what to bring..."
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Date *"
            type="date"
            value={form.date}
            onChange={(e) => handleChange('date', e.target.value)}
          />
          <Input
            label="Start Time *"
            type="time"
            value={form.time}
            onChange={(e) => handleChange('time', e.target.value)}
          />
        </div>

        <Input
          label="Meeting Location *"
          value={form.location}
          onChange={(e) => handleChange('location', e.target.value)}
          placeholder="e.g. Central Park South entrance"
        />

        {/* Gym-specific fields */}
        {isGymSport && (
          <div className="border-t border-[#2A2A2A] pt-4">
            <p className="text-xs font-bold text-[#FF4500] uppercase tracking-wider mb-4">Gym Session Settings</p>

            <div className="flex flex-col gap-4">
              <Input
                label="Gym Name / Address"
                value={form.gymName}
                onChange={(e) => handleChange('gymName', e.target.value)}
                placeholder="e.g. Gold's Gym, 123 Main St"
              />

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-2">
                  Workout Type
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {WORKOUT_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleChange('workoutType', form.workoutType === type ? '' : type)}
                      className="p-2 border text-xs font-medium capitalize transition-all"
                      style={
                        form.workoutType === type
                          ? { borderColor: '#FF4500', background: 'rgba(255,69,0,0.1)', color: '#FF4500' }
                          : { borderColor: '#2A2A2A', background: 'transparent', color: '#888888' }
                      }
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-2">
                  Minimum Strength Level
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
                        onClick={() => handleChange('strengthLevelRequired', form.strengthLevelRequired === level ? '' : level)}
                        className="p-2 border text-xs font-medium capitalize transition-all"
                        style={
                          form.strengthLevelRequired === level
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
                  Equipment Needed
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {EQUIPMENT_OPTIONS.map((item) => {
                    const isSelected = form.equipmentNeeded.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleEquipment(item)}
                        className="p-2 border text-xs font-medium transition-all"
                        style={
                          isSelected
                            ? { borderColor: '#FF4500', background: 'rgba(255,69,0,0.1)', color: '#FF4500' }
                            : { borderColor: '#2A2A2A', background: 'transparent', color: '#888888' }
                        }
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Latitude (optional)"
            type="number"
            step="any"
            value={form.lat}
            onChange={(e) => handleChange('lat', e.target.value)}
            placeholder="52.2297"
          />
          <Input
            label="Longitude (optional)"
            type="number"
            step="any"
            value={form.lon}
            onChange={(e) => handleChange('lon', e.target.value)}
            placeholder="21.0122"
          />
        </div>

        <Input
          label="Max Participants"
          type="number"
          min="2"
          max="100"
          value={form.maxParticipants}
          onChange={(e) => handleChange('maxParticipants', e.target.value)}
        />

        {!isGymSport && (
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-3">
              Route GPX File (optional)
            </label>
            {form.gpxUrl ? (
              <div className="flex items-center gap-3 p-3 bg-[#111111] border border-[#00CC44]">
                <Upload className="w-4 h-4 text-[#00CC44]" />
                <span className="text-sm text-[#00CC44]">GPX uploaded</span>
                <button
                  type="button"
                  onClick={() => handleChange('gpxUrl', '')}
                  className="ml-auto text-[#888888] hover:text-red-400 text-xs"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="cursor-pointer block">
                <input type="file" accept=".gpx" onChange={handleGpxUpload} className="hidden" />
                <div className="flex items-center gap-3 p-3 border border-dashed border-[#2A2A2A] text-[#888888] hover:border-[#FF4500] hover:text-white transition-all">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">
                    {gpxUploading ? 'Uploading...' : 'Click to upload .gpx route file'}
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
            Cancel
          </Button>
          <Button type="submit" loading={submitting} className="flex-1">
            <Plus className="w-4 h-4" />
            Create Session
          </Button>
        </div>
      </form>
    </div>
  );
}
