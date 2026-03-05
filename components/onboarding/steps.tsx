'use client';

import React from 'react';
import { Input, Textarea } from '@/components/ui/input';
import { SPORTS, getSportColor } from '@/lib/utils';

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
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-3">
          Select your sports (pick all that apply)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SPORTS.map((sport) => {
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
        <p className="text-xs text-[#888888] mt-1">
          Used for running/cycling pace matching
        </p>
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

export function Step4Photo({ data, onChange }: StepProps) {
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState('');

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
    <div className="flex flex-col gap-6 items-center">
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
  );
}
