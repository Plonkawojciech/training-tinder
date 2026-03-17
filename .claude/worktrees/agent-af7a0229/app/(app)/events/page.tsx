'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Flag,
  Plus,
  Trash2,
  Globe,
  Lock,
  Calendar,
  MapPin,
  Timer,
  Trophy,
  ChevronRight,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UserEvent {
  id: number;
  userId: string;
  eventName: string;
  eventType: string;
  sport: string;
  eventDate: string;
  location: string | null;
  distanceKm: number | null;
  targetTimeSec: number | null;
  status: string;
  isPublic: boolean;
  createdAt: string;
  creatorUsername?: string | null;
  creatorAvatarUrl?: string | null;
}

interface EventsData {
  myEvents: UserEvent[];
  publicEvents: UserEvent[];
}

type ActiveTab = 'mine' | 'discover';

const EVENT_TYPES = [
  'race',
  'competition',
  'training',
  'sportive',
  'fun_run',
  'triathlon',
  'marathon',
  'gran_fondo',
];

const SPORTS = ['running', 'cycling', 'swimming', 'triathlon', 'crossfit', 'strength', 'rowing', 'other'];

const STATUS_OPTIONS = ['registered', 'considering', 'completed', 'dnf'];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getCountdown(dateStr: string): { label: string; urgent: boolean } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const event = new Date(dateStr + 'T00:00:00');
  const diffMs = event.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d ago`, urgent: false };
  if (diffDays === 0) return { label: 'TODAY', urgent: true };
  if (diffDays === 1) return { label: 'TOMORROW', urgent: true };
  if (diffDays <= 7) return { label: `${diffDays}d`, urgent: true };
  if (diffDays <= 30) return { label: `${diffDays}d`, urgent: false };
  const weeks = Math.round(diffDays / 7);
  return { label: `${weeks}w`, urgent: false };
}

function formatTargetTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    race: '#7C3AED',
    marathon: '#7C3AED',
    competition: '#EF4444',
    triathlon: '#8B5CF6',
    sportive: '#3B82F6',
    gran_fondo: '#3B82F6',
    fun_run: '#22C55E',
    training: '#888888',
  };
  return colors[type] ?? '#888888';
}

function EventCard({
  event,
  onDelete,
  showCreator,
}: {
  event: UserEvent;
  onDelete?: (id: number) => void;
  showCreator?: boolean;
}) {
  const countdown = getCountdown(event.eventDate);
  const isPast = new Date(event.eventDate + 'T00:00:00') < new Date();
  const typeColor = getTypeColor(event.eventType);

  return (
    <div
      className={`bg-[var(--bg-card)] border border-[var(--border)] p-4 hover:border-[#3A3A3A] transition-all ${isPast ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5"
              style={{ color: typeColor, background: `${typeColor}1A` }}
            >
              {event.eventType.replace('_', ' ')}
            </span>
            <span className="text-[10px] text-[#555555] uppercase">{event.sport}</span>
          </div>
          <h3 className="text-white font-medium text-sm truncate">{event.eventName}</h3>
          {showCreator && event.creatorUsername && (
            <p className="text-[10px] text-[#555555] mt-0.5">by {event.creatorUsername}</p>
          )}
        </div>

        {/* Countdown badge */}
        <div className="shrink-0 text-right">
          <div
            className="text-xs font-bold font-display px-2 py-1"
            style={
              countdown.urgent
                ? { background: '#7C3AED', color: 'white' }
                : { background: '#1A1A1A', color: '#888888' }
            }
          >
            {countdown.label}
          </div>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-4 text-xs text-[#555555] mb-3">
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {formatDate(event.eventDate)}
        </span>
        {event.location && (
          <span className="flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 shrink-0" />
            {event.location}
          </span>
        )}
        {event.distanceKm && (
          <span className="text-[#888888]">{event.distanceKm}km</span>
        )}
        {event.targetTimeSec && (
          <span className="flex items-center gap-1">
            <Timer className="w-3 h-3" />
            {formatTargetTime(event.targetTimeSec)}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 border"
            style={
              event.status === 'completed'
                ? { color: '#22C55E', borderColor: '#22C55E33' }
                : event.status === 'dnf'
                ? { color: '#EF4444', borderColor: '#EF444433' }
                : { color: '#555555', borderColor: '#2A2A2A' }
            }
          >
            {event.status}
          </span>
          <span className="text-[10px] text-[#444444] flex items-center gap-1">
            {event.isPublic ? (
              <><Globe className="w-3 h-3" /> Public</>
            ) : (
              <><Lock className="w-3 h-3" /> Private</>
            )}
          </span>
        </div>

        {onDelete && (
          <button
            onClick={() => onDelete(event.id)}
            className="text-[#444444] hover:text-[#EF4444] transition-colors p-1"
            title="Delete event"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function AddEventModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    eventName: '',
    eventType: 'race',
    sport: 'running',
    eventDate: '',
    location: '',
    distanceKm: '',
    targetTimeHrs: '',
    targetTimeMins: '',
    targetTimeSecs: '',
    isPublic: true,
    status: 'registered',
  });

  function set(field: string, value: string | boolean) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.eventName || !form.eventDate) return;

    setSaving(true);
    try {
      let targetTimeSec: number | undefined;
      const h = parseInt(form.targetTimeHrs) || 0;
      const m = parseInt(form.targetTimeMins) || 0;
      const s = parseInt(form.targetTimeSecs) || 0;
      if (h > 0 || m > 0 || s > 0) {
        targetTimeSec = h * 3600 + m * 60 + s;
      }

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName: form.eventName,
          eventType: form.eventType,
          sport: form.sport,
          eventDate: form.eventDate,
          location: form.location || undefined,
          distanceKm: form.distanceKm ? parseFloat(form.distanceKm) : undefined,
          targetTimeSec,
          isPublic: form.isPublic,
          status: form.status,
        }),
      });

      if (res.ok) {
        onCreated();
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h2 className="font-display text-lg text-white tracking-wider">ADD EVENT</h2>
          <button onClick={onClose} className="text-[#888888] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
          {/* Event name */}
          <div>
            <label className="block text-xs text-[#888888] uppercase tracking-wider mb-1.5">
              Event Name *
            </label>
            <input
              required
              type="text"
              value={form.eventName}
              onChange={(e) => set('eventName', e.target.value)}
              placeholder="e.g. Berlin Marathon 2026"
              className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2 text-sm focus:outline-none focus:border-[#7C3AED] transition-colors"
            />
          </div>

          {/* Type + Sport */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#888888] uppercase tracking-wider mb-1.5">
                Event Type *
              </label>
              <select
                value={form.eventType}
                onChange={(e) => set('eventType', e.target.value)}
                className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2 text-sm focus:outline-none focus:border-[#7C3AED] transition-colors"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#888888] uppercase tracking-wider mb-1.5">
                Sport *
              </label>
              <select
                value={form.sport}
                onChange={(e) => set('sport', e.target.value)}
                className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2 text-sm focus:outline-none focus:border-[#7C3AED] transition-colors"
              >
                {SPORTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date + Location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#888888] uppercase tracking-wider mb-1.5">
                Event Date *
              </label>
              <input
                required
                type="date"
                value={form.eventDate}
                onChange={(e) => set('eventDate', e.target.value)}
                className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2 text-sm focus:outline-none focus:border-[#7C3AED] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-[#888888] uppercase tracking-wider mb-1.5">
                Location
              </label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
                placeholder="City, Country"
                className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2 text-sm focus:outline-none focus:border-[#7C3AED] transition-colors"
              />
            </div>
          </div>

          {/* Distance + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#888888] uppercase tracking-wider mb-1.5">
                Distance (km)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.distanceKm}
                onChange={(e) => set('distanceKm', e.target.value)}
                placeholder="e.g. 42.195"
                className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2 text-sm focus:outline-none focus:border-[#7C3AED] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-[#888888] uppercase tracking-wider mb-1.5">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
                className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2 text-sm focus:outline-none focus:border-[#7C3AED] transition-colors"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Target time */}
          <div>
            <label className="block text-xs text-[#888888] uppercase tracking-wider mb-1.5">
              Target Time (optional)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="99"
                value={form.targetTimeHrs}
                onChange={(e) => set('targetTimeHrs', e.target.value)}
                placeholder="HH"
                className="w-16 bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-2 py-2 text-sm text-center focus:outline-none focus:border-[#7C3AED] transition-colors font-mono"
              />
              <span className="text-[#555555]">:</span>
              <input
                type="number"
                min="0"
                max="59"
                value={form.targetTimeMins}
                onChange={(e) => set('targetTimeMins', e.target.value)}
                placeholder="MM"
                className="w-16 bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-2 py-2 text-sm text-center focus:outline-none focus:border-[#7C3AED] transition-colors font-mono"
              />
              <span className="text-[#555555]">:</span>
              <input
                type="number"
                min="0"
                max="59"
                value={form.targetTimeSecs}
                onChange={(e) => set('targetTimeSecs', e.target.value)}
                placeholder="SS"
                className="w-16 bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-2 py-2 text-sm text-center focus:outline-none focus:border-[#7C3AED] transition-colors font-mono"
              />
              <span className="text-xs text-[#555555]">hrs : min : sec</span>
            </div>
          </div>

          {/* Public toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => set('isPublic', !form.isPublic)}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                form.isPublic ? 'bg-[#7C3AED]' : 'bg-[#2A2A2A]'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                  form.isPublic ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-sm text-[#888888]">
              {form.isPublic ? 'Public (visible to other athletes)' : 'Private'}
            </span>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <Button variant="outline" size="sm" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Add Event'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NextEventCountdown({ event }: { event: UserEvent }) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const eventDate = new Date(event.eventDate + 'T00:00:00');
  const diffMs = eventDate.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return null;

  return (
    <div className="bg-gradient-to-r from-[#7C3AED]/10 to-transparent border border-[#7C3AED]/30 p-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] text-[#7C3AED] uppercase tracking-widest mb-1">Next Event</p>
          <h2 className="text-white font-medium">{event.eventName}</h2>
          <p className="text-xs text-[#888888] mt-0.5">
            {formatDate(event.eventDate)}
            {event.location ? ` · ${event.location}` : ''}
          </p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-display text-[#7C3AED]">{diffDays}</div>
          <div className="text-xs text-[#888888] uppercase tracking-wider">days to go</div>
        </div>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const [data, setData] = useState<EventsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('mine');
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/events?public=true');
      if (res.ok) {
        const d: EventsData = await res.json();
        setData(d);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  async function handleDelete(id: number) {
    const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setData((prev) =>
        prev ? { ...prev, myEvents: prev.myEvents.filter((e) => e.id !== id) } : prev
      );
    }
  }

  // Find next upcoming event
  const today = new Date().toISOString().split('T')[0];
  const upcomingMine = data?.myEvents.filter(
    (e) => e.eventDate >= today && e.status !== 'completed' && e.status !== 'dnf'
  );
  const nextEvent = upcomingMine?.[upcomingMine.length - 1] ?? upcomingMine?.[0];

  // Sort my events: upcoming first (ascending), then past (descending)
  const sortedMyEvents = data?.myEvents
    ? [
        ...data.myEvents
          .filter((e) => e.eventDate >= today)
          .sort((a, b) => a.eventDate.localeCompare(b.eventDate)),
        ...data.myEvents
          .filter((e) => e.eventDate < today)
          .sort((a, b) => b.eventDate.localeCompare(a.eventDate)),
      ]
    : [];

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Flag className="w-5 h-5 text-[#7C3AED]" />
            <h1 className="font-display text-3xl text-white tracking-wider">EVENTS</h1>
          </div>
          <p className="text-[#888888] text-sm ml-8">Your races, competitions and training goals</p>
        </div>
        <Button size="sm" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4" />
          Add Event
        </Button>
      </div>

      {/* Next event countdown */}
      {!loading && nextEvent && upcomingMine && upcomingMine.length > 0 && (
        <NextEventCountdown event={upcomingMine[0]} />
      )}

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] mb-6">
        <button
          onClick={() => setActiveTab('mine')}
          className="px-4 py-2.5 text-sm font-medium uppercase tracking-wider border-b-2 transition-all flex items-center gap-2"
          style={
            activeTab === 'mine'
              ? { borderColor: '#7C3AED', color: '#7C3AED' }
              : { borderColor: 'transparent', color: '#888888' }
          }
        >
          <Trophy className="w-4 h-4" />
          My Events
          {data && (
            <span className="text-[10px] bg-[var(--bg-elevated)] px-1.5 py-0.5">
              {data.myEvents.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('discover')}
          className="px-4 py-2.5 text-sm font-medium uppercase tracking-wider border-b-2 transition-all flex items-center gap-2"
          style={
            activeTab === 'discover'
              ? { borderColor: '#7C3AED', color: '#7C3AED' }
              : { borderColor: 'transparent', color: '#888888' }
          }
        >
          <Globe className="w-4 h-4" />
          Odkryj
          {data && (
            <span className="text-[10px] bg-[var(--bg-elevated)] px-1.5 py-0.5">
              {data.publicEvents.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 skeleton" />
          ))}
        </div>
      ) : (
        <>
          {activeTab === 'mine' && (
            <div>
              {sortedMyEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 bg-[var(--bg-card)] border border-[var(--border)]">
                  <Flag className="w-12 h-12 text-[#2A2A2A]" />
                  <h3 className="font-display text-xl text-[#888888]">NO EVENTS YET</h3>
                  <p className="text-[#555555] text-sm text-center max-w-sm">
                    Add your upcoming races and competitions to track your goals and countdowns.
                  </p>
                  <Button onClick={() => setShowAddModal(true)}>
                    <Plus className="w-4 h-4" />
                    Add First Event
                  </Button>
                </div>
              ) : (
                <>
                  {/* Upcoming */}
                  {upcomingMine && upcomingMine.length > 0 && (
                    <div className="mb-6">
                      <h2 className="font-display text-xs text-[#888888] tracking-widest mb-3 px-1">UPCOMING</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {sortedMyEvents
                          .filter((e) => e.eventDate >= today)
                          .map((event) => (
                            <EventCard key={event.id} event={event} onDelete={handleDelete} />
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Past */}
                  {sortedMyEvents.filter((e) => e.eventDate < today).length > 0 && (
                    <div>
                      <h2 className="font-display text-xs text-[#888888] tracking-widest mb-3 px-1">PAST EVENTS</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {sortedMyEvents
                          .filter((e) => e.eventDate < today)
                          .map((event) => (
                            <EventCard key={event.id} event={event} onDelete={handleDelete} />
                          ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'discover' && (
            <div>
              {(data?.publicEvents ?? []).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 bg-[var(--bg-card)] border border-[var(--border)]">
                  <Globe className="w-12 h-12 text-[#2A2A2A]" />
                  <h3 className="font-display text-xl text-[#888888]">BRAK WYDARZEŃ</h3>
                  <p className="text-[#555555] text-sm text-center max-w-sm">
                    Brak nadchodzących wydarzeń od innych sportowców. Bądź pierwszy!
                  </p>
                  <Button onClick={() => { setActiveTab('mine'); setShowAddModal(true); }}>
                    Dodaj Wydarzenie
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {data?.publicEvents.map((event) => (
                    <EventCard key={event.id} event={event} showCreator />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Add event modal */}
      {showAddModal && (
        <AddEventModal
          onClose={() => setShowAddModal(false)}
          onCreated={fetchEvents}
        />
      )}
    </div>
  );
}
