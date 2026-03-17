'use client';

import { useState, useMemo } from 'react';
import { CalendarDays, Clock, MapPin, Users, Repeat } from 'lucide-react';
import { Input, Textarea } from '@/components/ui/input';
import { SPORTS, getSportColor } from '@/lib/utils';

export interface SeriesFormData {
  title: string;
  sport: string;
  dayOfWeek: number; // 0=Mon ... 6=Sun
  time: string;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  location: string;
  lat: string;
  lon: string;
  maxParticipants: string;
  description: string;
  minLevel: string;
  startDate: string;
  endDate: string;
}

export const DEFAULT_SERIES_FORM: SeriesFormData = {
  title: '',
  sport: '',
  dayOfWeek: 0,
  time: '07:00',
  frequency: 'weekly',
  location: '',
  lat: '',
  lon: '',
  maxParticipants: '10',
  description: '',
  minLevel: '',
  startDate: '',
  endDate: '',
};

interface SeriesFormProps {
  form: SeriesFormData;
  onChange: (form: SeriesFormData) => void;
}

const DAYS = [
  { label: 'Mon', value: 0 },
  { label: 'Tue', value: 1 },
  { label: 'Wed', value: 2 },
  { label: 'Thu', value: 3 },
  { label: 'Fri', value: 4 },
  { label: 'Sat', value: 5 },
  { label: 'Sun', value: 6 },
];

const FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const LEVELS = [
  { value: '', label: 'Any Level', color: '#888888' },
  { value: 'beginner', label: 'Beginner', color: '#00CC44' },
  { value: 'recreational', label: 'Recreational', color: '#FFD700' },
  { value: 'competitive', label: 'Competitive', color: '#A78BFA' },
  { value: 'elite', label: 'Elite', color: '#7C3AED' },
];

function computeNextOccurrences(
  startDate: string,
  dayOfWeek: number, // 0=Mon
  time: string,
  frequency: 'weekly' | 'biweekly' | 'monthly',
  count: number = 4
): Date[] {
  if (!startDate) return [];

  const start = new Date(startDate);
  if (isNaN(start.getTime())) return [];

  const [h, m] = time.split(':').map(Number);
  const results: Date[] = [];

  // Find the first occurrence on or after startDate with the matching day of week
  // JS getDay(): 0=Sun, 1=Mon... so we convert our 0=Mon to JS day
  const jsDayOfWeek = dayOfWeek === 6 ? 0 : dayOfWeek + 1;

  let candidate = new Date(start);
  candidate.setHours(h ?? 7, m ?? 0, 0, 0);

  // Advance to the correct day of week
  while (candidate.getDay() !== jsDayOfWeek) {
    candidate.setDate(candidate.getDate() + 1);
  }

  for (let i = 0; i < count; i++) {
    results.push(new Date(candidate));

    if (frequency === 'weekly') {
      candidate.setDate(candidate.getDate() + 7);
    } else if (frequency === 'biweekly') {
      candidate.setDate(candidate.getDate() + 14);
    } else {
      // monthly: same day of month, approximately 4 weeks ahead
      candidate.setMonth(candidate.getMonth() + 1);
    }
  }

  return results;
}

function formatOccurrence(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function SeriesForm({ form, onChange }: SeriesFormProps) {
  function update(partial: Partial<SeriesFormData>) {
    onChange({ ...form, ...partial });
  }

  const nextOccurrences = useMemo(
    () => computeNextOccurrences(form.startDate, form.dayOfWeek, form.time, form.frequency, 4),
    [form.startDate, form.dayOfWeek, form.time, form.frequency]
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Sport selector */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-3">
          Sport *
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
          {SPORTS.slice(0, 8).map((sport) => {
            const color = getSportColor(sport.value);
            const isSelected = form.sport === sport.value;
            return (
              <button
                key={sport.value}
                type="button"
                onClick={() => update({ sport: sport.value })}
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
            const isSelected = form.sport === sport.value;
            return (
              <button
                key={sport.value}
                type="button"
                onClick={() => update({ sport: sport.value })}
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
        label="Series Title *"
        value={form.title}
        onChange={(e) => update({ title: e.target.value })}
        placeholder="e.g. Wednesday Evening Ride"
      />

      <Textarea
        label="Description"
        value={form.description}
        onChange={(e) => update({ description: e.target.value })}
        placeholder="Describe the recurring session, typical route or workout..."
      />

      {/* Day of week picker */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-2">
          <CalendarDays className="inline w-3.5 h-3.5 mr-1" />
          Day of Week *
        </label>
        <div className="flex gap-2">
          {DAYS.map((day) => (
            <button
              key={day.value}
              type="button"
              onClick={() => update({ dayOfWeek: day.value })}
              className="flex-1 py-2 border text-xs font-semibold uppercase tracking-wider transition-all"
              style={
                form.dayOfWeek === day.value
                  ? { borderColor: '#7C3AED', background: 'rgba(124,58,237,0.15)', color: '#7C3AED' }
                  : { borderColor: '#2A2A2A', background: 'transparent', color: '#888888' }
              }
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      {/* Time + Frequency */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-2">
            <Clock className="inline w-3.5 h-3.5 mr-1" />
            Start Time *
          </label>
          <input
            type="time"
            value={form.time}
            onChange={(e) => update({ time: e.target.value })}
            className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2.5 text-sm focus:border-[#7C3AED] focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-2">
            <Repeat className="inline w-3.5 h-3.5 mr-1" />
            Frequency *
          </label>
          <div className="flex flex-col gap-1">
            {FREQUENCIES.map((freq) => (
              <button
                key={freq.value}
                type="button"
                onClick={() => update({ frequency: freq.value as SeriesFormData['frequency'] })}
                className="w-full py-2 border text-xs font-semibold uppercase tracking-wider transition-all text-left px-3"
                style={
                  form.frequency === freq.value
                    ? { borderColor: '#7C3AED', background: 'rgba(124,58,237,0.1)', color: '#7C3AED' }
                    : { borderColor: '#2A2A2A', background: 'transparent', color: '#888888' }
                }
              >
                {freq.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Location */}
      <div>
        <Input
          label="Meeting Location *"
          value={form.location}
          onChange={(e) => update({ location: e.target.value })}
          placeholder="e.g. Central Park South entrance"
        />
        <div className="grid grid-cols-2 gap-4 mt-3">
          <Input
            label="Latitude (optional)"
            type="number"
            step="any"
            value={form.lat}
            onChange={(e) => update({ lat: e.target.value })}
            placeholder="52.2297"
          />
          <Input
            label="Longitude (optional)"
            type="number"
            step="any"
            value={form.lon}
            onChange={(e) => update({ lon: e.target.value })}
            placeholder="21.0122"
          />
        </div>
      </div>

      {/* Start / End date */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Start Date *"
          type="date"
          value={form.startDate}
          onChange={(e) => update({ startDate: e.target.value })}
        />
        <Input
          label="End Date (optional)"
          type="date"
          value={form.endDate}
          onChange={(e) => update({ endDate: e.target.value })}
        />
      </div>

      {/* Minimum Level */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-2">
          Minimum Level Required
        </label>
        <div className="flex gap-2 flex-wrap">
          {LEVELS.map((level) => (
            <button
              key={level.value}
              type="button"
              onClick={() => update({ minLevel: level.value })}
              className="px-3 py-2 border text-xs font-semibold uppercase tracking-wider transition-all"
              style={
                form.minLevel === level.value
                  ? { borderColor: level.color, background: `${level.color}20`, color: level.color }
                  : { borderColor: '#2A2A2A', background: 'transparent', color: '#888888' }
              }
            >
              {level.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-2">
          <Users className="inline w-3.5 h-3.5 mr-1" />
          Max Participants
        </label>
        <input
          type="number"
          min={2}
          max={100}
          value={form.maxParticipants}
          onChange={(e) => update({ maxParticipants: e.target.value })}
          className="w-32 bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2.5 text-sm focus:border-[#7C3AED] focus:outline-none"
        />
      </div>

      {/* Preview of next 4 occurrences */}
      {nextOccurrences.length > 0 && (
        <div className="border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#888888] mb-3">
            <MapPin className="inline w-3.5 h-3.5 mr-1" />
            Next 4 Occurrences Preview
          </p>
          <div className="flex flex-col gap-2">
            {nextOccurrences.map((date, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[#7C3AED] text-xs font-semibold w-4">{i + 1}</span>
                <span className="text-white text-sm">{formatOccurrence(date)}</span>
                <span className="text-[#888888] text-xs">at {form.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
