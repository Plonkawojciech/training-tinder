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
import { useLang } from '@/lib/lang';
import type { TKey } from '@/lib/lang';

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

const EVENT_TYPE_KEYS: Record<string, TKey> = {
  race: 'events_type_race', competition: 'events_type_competition', training: 'events_type_training',
  sportive: 'events_type_sportive', fun_run: 'events_type_fun_run', triathlon: 'events_type_triathlon',
  marathon: 'events_type_marathon', gran_fondo: 'events_type_gran_fondo',
};

const SPORTS = ['running', 'cycling', 'swimming', 'triathlon', 'crossfit', 'strength', 'rowing', 'other'];

const SPORT_KEYS: Record<string, TKey> = {
  running: 'events_sport_running', cycling: 'events_sport_cycling', swimming: 'events_sport_swimming',
  triathlon: 'events_sport_triathlon', crossfit: 'events_sport_crossfit', strength: 'events_sport_strength',
  rowing: 'events_sport_rowing', other: 'events_sport_other',
};

const STATUS_OPTIONS = ['registered', 'considering', 'completed', 'dnf'];

const STATUS_KEYS: Record<string, TKey> = {
  registered: 'events_status_registered', considering: 'events_status_considering',
  completed: 'events_status_completed', dnf: 'events_status_dnf',
};

function formatTargetTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    race: '#6366F1',
    marathon: '#6366F1',
    competition: '#EF4444',
    triathlon: '#818CF8',
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
  t,
  lang,
}: {
  event: UserEvent;
  onDelete?: (id: number) => void;
  showCreator?: boolean;
  t: (key: TKey) => string;
  lang: string;
}) {
  const locale = lang === 'pl' ? 'pl-PL' : 'en-US';

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function getCountdown(dateStr: string): { label: string; urgent: boolean } {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const ev = new Date(dateStr + 'T00:00:00');
    const diffMs = ev.getTime() - now.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: `${Math.abs(diffDays)}${t('events_days_ago')}`, urgent: false };
    if (diffDays === 0) return { label: t('events_today'), urgent: true };
    if (diffDays === 1) return { label: t('events_tomorrow'), urgent: true };
    if (diffDays <= 7) return { label: `${diffDays}d`, urgent: true };
    if (diffDays <= 30) return { label: `${diffDays}d`, urgent: false };
    const weeks = Math.round(diffDays / 7);
    return { label: `${weeks}${t('events_weeks')}`, urgent: false };
  }

  const countdown = getCountdown(event.eventDate);
  const isPast = new Date(event.eventDate + 'T00:00:00') < new Date();
  const typeColor = getTypeColor(event.eventType);

  const typeKey = EVENT_TYPE_KEYS[event.eventType];
  const sportKey = SPORT_KEYS[event.sport];
  const statusKey = STATUS_KEYS[event.status];

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
              {typeKey ? t(typeKey) : event.eventType.replace('_', ' ')}
            </span>
            <span className="text-[10px] text-[#555555] uppercase">{sportKey ? t(sportKey) : event.sport}</span>
          </div>
          <h3 className="text-white font-medium text-sm truncate">{event.eventName}</h3>
          {showCreator && event.creatorUsername && (
            <p className="text-[10px] text-[#555555] mt-0.5">{t('events_from')} {event.creatorUsername}</p>
          )}
        </div>

        {/* Countdown badge */}
        <div className="shrink-0 text-right">
          <div
            className="text-xs font-bold font-display px-2 py-1"
            style={
              countdown.urgent
                ? { background: '#6366F1', color: 'white' }
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
            {statusKey ? t(statusKey) : event.status}
          </span>
          <span className="text-[10px] text-[#444444] flex items-center gap-1">
            {event.isPublic ? (
              <><Globe className="w-3 h-3" /> {t('events_public')}</>
            ) : (
              <><Lock className="w-3 h-3" /> {t('events_private')}</>
            )}
          </span>
        </div>

        {onDelete && (
          <button
            onClick={() => onDelete(event.id)}
            className="text-[#444444] hover:text-[#EF4444] transition-colors p-1"
            title={t('events_delete_title')}
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
  t,
  lang,
}: {
  onClose: () => void;
  onCreated: () => void;
  t: (key: TKey) => string;
  lang: string;
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
          <h2 className="font-display text-lg text-white tracking-wider">{t('events_modal_title')}</h2>
          <button onClick={onClose} className="text-[#888888] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
          {/* Event name */}
          <div>
            <label className="block text-xs text-[#888888] uppercase tracking-wider mb-1.5">
              {t('events_name_label')} *
            </label>
            <input
              required
              type="text"
              value={form.eventName}
              onChange={(e) => set('eventName', e.target.value)}
              placeholder={t('events_name_placeholder')}
              className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2 text-sm focus:outline-none focus:border-[#6366F1] transition-colors"
            />
          </div>

          {/* Type + Sport */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#888888] uppercase tracking-wider mb-1.5">
                {t('events_type_label')} *
              </label>
              <select
                value={form.eventType}
                onChange={(e) => set('eventType', e.target.value)}
                className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2 text-sm focus:outline-none focus:border-[#6366F1] transition-colors"
              >
                {EVENT_TYPES.map((tp) => {
                  const key = EVENT_TYPE_KEYS[tp];
                  return (
                    <option key={tp} value={tp}>
                      {key ? t(key) : tp.replace('_', ' ')}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#888888] uppercase tracking-wider mb-1.5">
                {t('events_sport_label')} *
              </label>
              <select
                value={form.sport}
                onChange={(e) => set('sport', e.target.value)}
                className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2 text-sm focus:outline-none focus:border-[#6366F1] transition-colors"
              >
                {SPORTS.map((s) => {
                  const key = SPORT_KEYS[s];
                  return (
                    <option key={s} value={s}>
                      {key ? t(key) : s}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Date + Location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#888888] uppercase tracking-wider mb-1.5">
                {t('events_date_label')} *
              </label>
              <input
                required
                type="date"
                value={form.eventDate}
                onChange={(e) => set('eventDate', e.target.value)}
                className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2 text-sm focus:outline-none focus:border-[#6366F1] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-[#888888] uppercase tracking-wider mb-1.5">
                {t('events_location_label')}
              </label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
                placeholder={t('events_location_placeholder')}
                className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2 text-sm focus:outline-none focus:border-[#6366F1] transition-colors"
              />
            </div>
          </div>

          {/* Distance + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#888888] uppercase tracking-wider mb-1.5">
                {t('events_distance_label')}
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.distanceKm}
                onChange={(e) => set('distanceKm', e.target.value)}
                placeholder={lang === 'pl' ? 'np. 42.195' : 'e.g. 42.195'}
                className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2 text-sm focus:outline-none focus:border-[#6366F1] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-[#888888] uppercase tracking-wider mb-1.5">
                {t('events_status_label')}
              </label>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
                className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2 text-sm focus:outline-none focus:border-[#6366F1] transition-colors"
              >
                {STATUS_OPTIONS.map((s) => {
                  const key = STATUS_KEYS[s];
                  return (
                    <option key={s} value={s}>
                      {key ? t(key) : s}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Target time */}
          <div>
            <label className="block text-xs text-[#888888] uppercase tracking-wider mb-1.5">
              {t('events_target_time')}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="99"
                value={form.targetTimeHrs}
                onChange={(e) => set('targetTimeHrs', e.target.value)}
                placeholder="HH"
                className="w-16 bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-2 py-2 text-sm text-center focus:outline-none focus:border-[#6366F1] transition-colors font-mono"
              />
              <span className="text-[#555555]">:</span>
              <input
                type="number"
                min="0"
                max="59"
                value={form.targetTimeMins}
                onChange={(e) => set('targetTimeMins', e.target.value)}
                placeholder="MM"
                className="w-16 bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-2 py-2 text-sm text-center focus:outline-none focus:border-[#6366F1] transition-colors font-mono"
              />
              <span className="text-[#555555]">:</span>
              <input
                type="number"
                min="0"
                max="59"
                value={form.targetTimeSecs}
                onChange={(e) => set('targetTimeSecs', e.target.value)}
                placeholder="SS"
                className="w-16 bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-2 py-2 text-sm text-center focus:outline-none focus:border-[#6366F1] transition-colors font-mono"
              />
              <span className="text-xs text-[#555555]">{t('events_hrs_min_sec')}</span>
            </div>
          </div>

          {/* Public toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => set('isPublic', !form.isPublic)}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                form.isPublic ? 'bg-[#6366F1]' : 'bg-[#2A2A2A]'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                  form.isPublic ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-sm text-[#888888]">
              {form.isPublic ? t('events_public_toggle') : t('events_private')}
            </span>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <Button variant="outline" size="sm" type="button" onClick={onClose}>
              {t('gen_cancel')}
            </Button>
            <Button size="sm" type="submit" disabled={saving}>
              {saving ? t('events_saving') : t('events_add')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NextEventCountdown({ event, t, lang }: { event: UserEvent; t: (key: TKey) => string; lang: string }) {
  const locale = lang === 'pl' ? 'pl-PL' : 'en-US';
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const eventDate = new Date(event.eventDate + 'T00:00:00');
  const diffMs = eventDate.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return null;

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <div className="bg-gradient-to-r from-[#6366F1]/10 to-transparent border border-[#6366F1]/30 p-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] text-[#6366F1] uppercase tracking-widest mb-1">{t('events_next')}</p>
          <h2 className="text-white font-medium">{event.eventName}</h2>
          <p className="text-xs text-[#888888] mt-0.5">
            {formatDate(event.eventDate)}
            {event.location ? ` · ${event.location}` : ''}
          </p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-display text-[#6366F1]">{diffDays}</div>
          <div className="text-xs text-[#888888] uppercase tracking-wider">{t('events_days_to_start')}</div>
        </div>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const { t, lang } = useLang();
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
            <Flag className="w-5 h-5 text-[#6366F1]" />
            <h1 className="font-display text-3xl text-white tracking-wider">{t('events_title')}</h1>
          </div>
          <p className="text-[#888888] text-sm ml-8">{t('events_subtitle')}</p>
        </div>
        <Button size="sm" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4" />
          {t('events_add')}
        </Button>
      </div>

      {/* Next event countdown */}
      {!loading && nextEvent && upcomingMine && upcomingMine.length > 0 && (
        <NextEventCountdown event={upcomingMine[0]} t={t} lang={lang} />
      )}

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] mb-6">
        <button
          onClick={() => setActiveTab('mine')}
          className="px-4 py-2.5 text-sm font-medium uppercase tracking-wider border-b-2 transition-all flex items-center gap-2"
          style={
            activeTab === 'mine'
              ? { borderColor: '#6366F1', color: '#6366F1' }
              : { borderColor: 'transparent', color: '#888888' }
          }
        >
          <Trophy className="w-4 h-4" />
          {t('events_my')}
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
              ? { borderColor: '#6366F1', color: '#6366F1' }
              : { borderColor: 'transparent', color: '#888888' }
          }
        >
          <Globe className="w-4 h-4" />
          {t('events_discover')}
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
                  <h3 className="font-display text-xl text-[#888888]">{t('events_none')}</h3>
                  <p className="text-[#555555] text-sm text-center max-w-sm">
                    {t('events_none_desc')}
                  </p>
                  <Button onClick={() => setShowAddModal(true)}>
                    <Plus className="w-4 h-4" />
                    {t('events_add_first')}
                  </Button>
                </div>
              ) : (
                <>
                  {/* Upcoming */}
                  {upcomingMine && upcomingMine.length > 0 && (
                    <div className="mb-6">
                      <h2 className="font-display text-xs text-[#888888] tracking-widest mb-3 px-1">{t('events_upcoming')}</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {sortedMyEvents
                          .filter((e) => e.eventDate >= today)
                          .map((event) => (
                            <EventCard key={event.id} event={event} onDelete={handleDelete} t={t} lang={lang} />
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Past */}
                  {sortedMyEvents.filter((e) => e.eventDate < today).length > 0 && (
                    <div>
                      <h2 className="font-display text-xs text-[#888888] tracking-widest mb-3 px-1">{t('events_past')}</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {sortedMyEvents
                          .filter((e) => e.eventDate < today)
                          .map((event) => (
                            <EventCard key={event.id} event={event} onDelete={handleDelete} t={t} lang={lang} />
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
                  <h3 className="font-display text-xl text-[#888888]">{t('events_none')}</h3>
                  <p className="text-[#555555] text-sm text-center max-w-sm">
                    {t('events_none_public')}
                  </p>
                  <Button onClick={() => { setActiveTab('mine'); setShowAddModal(true); }}>
                    {t('events_add_event')}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {data?.publicEvents.map((event) => (
                    <EventCard key={event.id} event={event} showCreator t={t} lang={lang} />
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
          t={t}
          lang={lang}
        />
      )}
    </div>
  );
}
