'use client';

import { useState, useEffect, useCallback } from 'react';
import { Target, Zap, Heart, Timer, Save, RefreshCw, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PowerZone {
  zone: number;
  name: string;
  minWatts: number;
  maxWatts: number;
  minPct: number;
  maxPct: number;
  color: string;
  description: string;
}

interface HRZone {
  zone: number;
  name: string;
  minBpm: number;
  maxBpm: number;
  minPct: number;
  maxPct: number;
  color: string;
  description: string;
}

interface PaceZone {
  zone: number;
  name: string;
  minPaceSec: number;
  maxPaceSec: number;
  minPaceStr: string;
  maxPaceStr: string;
  color: string;
  description: string;
}

interface ZonesData {
  ftp: number | null;
  maxHr: number | null;
  thresholdPaceSec: number | null;
  powerZones: PowerZone[] | null;
  hrZones: HRZone[] | null;
  paceZones: PaceZone[] | null;
}

type ActiveTab = 'power' | 'hr' | 'pace';

function ZoneBar({
  label,
  range,
  color,
  description,
  width,
}: {
  label: string;
  range: string;
  color: string;
  description: string;
  width: number;
}) {
  const [showDesc, setShowDesc] = useState(false);

  return (
    <div className="group">
      <div
        className="relative flex items-center gap-3 p-3 border border-[var(--border)] hover:border-[var(--border)] transition-all cursor-pointer"
        onClick={() => setShowDesc((v) => !v)}
      >
        {/* Zone color bar */}
        <div
          className="w-1 self-stretch rounded-2xl"
          style={{ background: color, minHeight: '100%' }}
        />
        {/* Fill bar */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-white text-sm font-medium">{label}</span>
            <span className="text-[#888888] text-xs font-mono">{range}</span>
          </div>
          <div className="h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min(width, 100)}%`, background: color }}
            />
          </div>
        </div>
        <Info className="w-3.5 h-3.5 text-[#444444] shrink-0 group-hover:text-[#888888] transition-colors" />
      </div>
      {showDesc && (
        <div className="px-4 py-2 bg-[var(--bg-card)] border border-t-0 border-[var(--border)] text-xs text-[var(--text-muted)]">
          {description}
        </div>
      )}
    </div>
  );
}

function secToMinKm(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')} /km`;
}

export default function TrainingPage() {
  const [data, setData] = useState<ZonesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('power');
  const [showInputs, setShowInputs] = useState(false);

  const [ftpInput, setFtpInput] = useState('');
  const [maxHrInput, setMaxHrInput] = useState('');
  const [paceInput, setPaceInput] = useState(''); // mm:ss format

  const fetchZones = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/training/zones');
      if (res.ok) {
        const d: ZonesData = await res.json();
        setData(d);
        if (d.ftp) setFtpInput(String(d.ftp));
        if (d.maxHr) setMaxHrInput(String(d.maxHr));
        if (d.thresholdPaceSec) {
          const m = Math.floor(d.thresholdPaceSec / 60);
          const s = d.thresholdPaceSec % 60;
          setPaceInput(`${m}:${s.toString().padStart(2, '0')}`);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  async function handleSave() {
    setSaving(true);
    try {
      const payload: Record<string, number | null> = {};

      const ftpVal = parseInt(ftpInput);
      if (!isNaN(ftpVal) && ftpVal > 0) payload.ftpWatts = ftpVal;

      const maxHrVal = parseInt(maxHrInput);
      if (!isNaN(maxHrVal) && maxHrVal > 0) payload.maxHr = maxHrVal;

      if (paceInput) {
        const parts = paceInput.split(':');
        if (parts.length === 2) {
          const paceSec = parseInt(parts[0]) * 60 + parseInt(parts[1]);
          if (!isNaN(paceSec) && paceSec > 0) payload.pacePerKm = paceSec;
        }
      }

      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchZones();
        setShowInputs(false);
      }
    } finally {
      setSaving(false);
    }
  }

  const tabs: { key: ActiveTab; label: string; icon: typeof Zap }[] = [
    { key: 'power', label: 'Strefy mocy', icon: Zap },
    { key: 'hr', label: 'Strefy HR', icon: Heart },
    { key: 'pace', label: 'Strefy tempa', icon: Timer },
  ];

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Target className="w-5 h-5 text-[#6366F1]" />
            <h1 className="font-display text-3xl text-white tracking-wider">STREFY TRENINGOWE</h1>
          </div>
          <p className="text-[#888888] text-sm ml-8">
            Strefy obliczone na podstawie Twoich danych wydolnościowych
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={fetchZones}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInputs((v) => !v)}
          >
            {showInputs ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
            Aktualizuj wartości
          </Button>
        </div>
      </div>

      {/* Input panel */}
      {showInputs && (
        <div className="mb-6 p-4 bg-[var(--bg-card)] border border-[var(--border)] animate-in fade-in slide-in-from-top-2 duration-200">
          <h2 className="font-display text-sm text-[#888888] tracking-wider mb-4">TWOJE DANE WYDOLNOŚCIOWE</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs text-[#888888] uppercase tracking-wider mb-1.5">
                FTP (W)
              </label>
              <input
                type="number"
                min="50"
                max="600"
                value={ftpInput}
                onChange={(e) => setFtpInput(e.target.value)}
                placeholder="np. 250"
                className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2 text-sm focus:outline-none focus:border-[#6366F1] transition-colors"
              />
              <p className="text-[10px] text-[#555555] mt-1">Funkcjonalna moc progowa (test 20 min × 0.95)</p>
            </div>
            <div>
              <label className="block text-xs text-[#888888] uppercase tracking-wider mb-1.5">
                Maks. tętno (bpm)
              </label>
              <input
                type="number"
                min="100"
                max="230"
                value={maxHrInput}
                onChange={(e) => setMaxHrInput(e.target.value)}
                placeholder="np. 185"
                className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2 text-sm focus:outline-none focus:border-[#6366F1] transition-colors"
              />
              <p className="text-[10px] text-[#555555] mt-1">Najwyższe tętno podczas testu maksymalnego</p>
            </div>
            <div>
              <label className="block text-xs text-[#888888] uppercase tracking-wider mb-1.5">
                Tempo progowe (mm:ss /km)
              </label>
              <input
                type="text"
                value={paceInput}
                onChange={(e) => setPaceInput(e.target.value)}
                placeholder="np. 4:30"
                className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2 text-sm focus:outline-none focus:border-[#6366F1] transition-colors font-mono"
              />
              <p className="text-[10px] text-[#555555] mt-1">Przybliżone tempo biegu na 10 km lub próg mleczanowy</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowInputs(false)}>
              Anuluj
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-1" />
              {saving ? 'Zapisywanie...' : 'Zapisz i przelicz'}
            </Button>
          </div>
        </div>
      )}

      {/* Stats summary */}
      {data && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-[#888888] text-xs uppercase tracking-wider mb-1">
              <Zap className="w-3.5 h-3.5 text-yellow-400" />
              FTP
            </div>
            <span className="text-2xl font-display text-white">
              {data.ftp ? `${data.ftp}W` : '—'}
            </span>
            <span className="text-[10px] text-[#555555]">Funkcjonalna moc progowa</span>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-[#888888] text-xs uppercase tracking-wider mb-1">
              <Heart className="w-3.5 h-3.5 text-red-400" />
              Max HR
            </div>
            <span className="text-2xl font-display text-white">
              {data.maxHr ? `${data.maxHr} bpm` : '—'}
            </span>
            <span className="text-[10px] text-[#555555]">Maksymalne tętno</span>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-[#888888] text-xs uppercase tracking-wider mb-1">
              <Timer className="w-3.5 h-3.5 text-blue-400" />
              Tempo progowe
            </div>
            <span className="text-2xl font-display text-white">
              {data.thresholdPaceSec ? secToMinKm(data.thresholdPaceSec) : '—'}
            </span>
            <span className="text-[10px] text-[#555555]">Tempo progowe</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] mb-4">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className="px-4 py-2.5 text-sm font-medium uppercase tracking-wider border-b-2 transition-all flex items-center gap-2"
            style={
              activeTab === key
                ? { borderColor: '#6366F1', color: '#6366F1' }
                : { borderColor: 'transparent', color: '#888888' }
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Zone content */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-14 skeleton" />
          ))}
        </div>
      ) : (
        <>
          {activeTab === 'power' && (
            <div>
              {!data?.powerZones ? (
                <EmptyZoneState
                  icon={Zap}
                  title="Brak FTP"
                  description="Wprowadź swój FTP (funkcjonalną moc progową), aby zobaczyć strefy mocy."
                  onSetValues={() => setShowInputs(true)}
                />
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between px-3 py-2 mb-1">
                    <span className="text-[10px] text-[#444444] uppercase tracking-widest">Strefa</span>
                    <span className="text-[10px] text-[#444444] uppercase tracking-widest">Zakres (W)</span>
                  </div>
                  {data.powerZones.map((z, i) => (
                    <ZoneBar
                      key={z.zone}
                      label={`Z${z.zone} · ${z.name}`}
                      range={z.maxWatts === 9999 ? `>${z.minWatts}W` : `${z.minWatts}–${z.maxWatts}W`}
                      color={z.color}
                      description={z.description}
                      width={(i + 1) * (100 / 7)}
                    />
                  ))}
                  <p className="text-[10px] text-[#444444] mt-3 px-1">
                    Na podstawie FTP: {data.ftp}W · model 7 stref Coggana
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'hr' && (
            <div>
              {!data?.hrZones ? (
                <EmptyZoneState
                  icon={Heart}
                  title="Brak maks. tętna"
                  description="Wprowadź swoje maksymalne tętno, aby zobaczyć strefy tętna."
                  onSetValues={() => setShowInputs(true)}
                />
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between px-3 py-2 mb-1">
                    <span className="text-[10px] text-[#444444] uppercase tracking-widest">Strefa</span>
                    <span className="text-[10px] text-[#444444] uppercase tracking-widest">Zakres (bpm)</span>
                  </div>
                  {data.hrZones.map((z, i) => (
                    <ZoneBar
                      key={z.zone}
                      label={`Z${z.zone} · ${z.name}`}
                      range={`${z.minBpm}–${z.maxBpm} bpm (${z.minPct}–${z.maxPct}% HRmax)`}
                      color={z.color}
                      description={z.description}
                      width={(i + 1) * (100 / 5)}
                    />
                  ))}
                  <p className="text-[10px] text-[#444444] mt-3 px-1">
                    Na podstawie maks. tętna: {data.maxHr} bpm · model 5 stref
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'pace' && (
            <div>
              {!data?.paceZones ? (
                <EmptyZoneState
                  icon={Timer}
                  title="Brak tempa progowego"
                  description="Wprowadź swoje tempo progowe (przybliżone tempo biegu na 10 km), aby zobaczyć strefy tempa."
                  onSetValues={() => setShowInputs(true)}
                />
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between px-3 py-2 mb-1">
                    <span className="text-[10px] text-[#444444] uppercase tracking-widest">Strefa</span>
                    <span className="text-[10px] text-[#444444] uppercase tracking-widest">Zakres tempa</span>
                  </div>
                  {data.paceZones.map((z, i) => (
                    <ZoneBar
                      key={z.zone}
                      label={`Z${z.zone} · ${z.name}`}
                      range={`${z.minPaceStr} – ${z.maxPaceStr}`}
                      color={z.color}
                      description={z.description}
                      width={(5 - i) * (100 / 5)}
                    />
                  ))}
                  <p className="text-[10px] text-[#444444] mt-3 px-1">
                    Na podstawie tempa progowego: {secToMinKm(data.thresholdPaceSec!)} · model 5 stref
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Info box */}
      <div className="mt-8 p-4 bg-[var(--bg-card)] border border-[var(--border)]">
        <h3 className="font-display text-xs text-[#888888] tracking-wider mb-2">JAK WYZNACZYĆ SWOJE STREFY</h3>
        <ul className="text-xs text-[#555555] space-y-1.5">
          <li>
            <span className="text-[#888888]">Test FTP:</span> Jedź 20 min z maksymalnym wysiłkiem, pomnóż średnią moc przez 0.95
          </li>
          <li>
            <span className="text-[#888888]">Maks. tętno:</span> Wykonaj interwały 400m lub dystans 1 mili z pełnym wysiłkiem i zapisz szczytowe tętno
          </li>
          <li>
            <span className="text-[#888888]">Tempo progowe:</span> Użyj ostatniego tempa biegu na 10 km lub wykonaj 30-minutowy test czasowy
          </li>
        </ul>
      </div>
    </div>
  );
}

function EmptyZoneState({
  icon: Icon,
  title,
  description,
  onSetValues,
}: {
  icon: typeof Zap;
  title: string;
  description: string;
  onSetValues: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 bg-[var(--bg-card)] border border-[var(--border)]">
      <Icon className="w-10 h-10 text-[#2A2A2A]" />
      <h3 className="font-display text-lg text-[#888888]">{title.toUpperCase()}</h3>
      <p className="text-[#555555] text-sm text-center max-w-sm">{description}</p>
      <Button size="sm" onClick={onSetValues}>
        Ustaw wartości
      </Button>
    </div>
  );
}
