'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { SPORTS, getSportColor } from '@/lib/utils';

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
}

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
  });
  const [submitting, setSubmitting] = useState(false);
  const [gpxUploading, setGpxUploading] = useState(false);
  const [error, setError] = useState('');

  function handleChange(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SPORTS.map((sport) => {
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

        {/* GPX Upload */}
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
              <input
                type="file"
                accept=".gpx"
                onChange={handleGpxUpload}
                className="hidden"
              />
              <div className="flex items-center gap-3 p-3 border border-dashed border-[#2A2A2A] text-[#888888] hover:border-[#FF4500] hover:text-white transition-all">
                <Upload className="w-4 h-4" />
                <span className="text-sm">
                  {gpxUploading ? 'Uploading...' : 'Click to upload .gpx route file'}
                </span>
              </div>
            </label>
          )}
        </div>

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
