'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Download, ChevronLeft, User, CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { ImportWidget } from '@/components/profile/import-widget';
import { Button } from '@/components/ui/button';

interface StravaStatus {
  connected: boolean;
  activityCount: number;
  stravaVerified: boolean;
  verifiedPacePerKm: number | null;
}

interface UserProfile {
  ftpWatts: number | null;
  maxHr: number | null;
  pacePerKm: number | null;
  weeklyKm: number | null;
  city: string | null;
  stravaVerified: boolean;
}

function formatPace(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')} /km`;
}

function ConnectionStatus({ label, connected, detail }: {
  label: string;
  connected: boolean;
  detail?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[var(--border)] last:border-0">
      <div className="flex items-center gap-3">
        {connected ? (
          <CheckCircle2 className="w-4 h-4 text-green-400" />
        ) : (
          <Circle className="w-4 h-4 text-[#2A2A2A]" />
        )}
        <span className="text-sm text-white">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {detail && <span className="text-xs text-[#555555]">{detail}</span>}
        <span
          className="text-xs px-2 py-0.5"
          style={
            connected
              ? { color: '#4ADE80', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)' }
              : { color: '#555555', background: '#0A0A0A', border: '1px solid #1A1A1A' }
          }
        >
          {connected ? 'Połączone' : 'Niepołączone'}
        </span>
      </div>
    </div>
  );
}

export default function ImportPage() {
  const [stravaStatus, setStravaStatus] = useState<StravaStatus | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statusRes, profileRes] = await Promise.all([
          fetch('/api/strava/status'),
          fetch('/api/users/profile'),
        ]);
        if (statusRes.ok) setStravaStatus(await statusRes.json() as StravaStatus);
        if (profileRes.ok) setUserProfile(await profileRes.json() as UserProfile);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Check which profile fields are set
  const hasData = {
    ftp: !!userProfile?.ftpWatts,
    maxHr: !!userProfile?.maxHr,
    pace: !!userProfile?.pacePerKm,
    weeklyKm: !!userProfile?.weeklyKm,
    city: !!userProfile?.city,
  };

  const completionCount = Object.values(hasData).filter(Boolean).length;
  const totalCount = Object.values(hasData).length;
  const completionPct = Math.round((completionCount / totalCount) * 100);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Back navigation */}
      <Link
        href="/profile"
        className="inline-flex items-center gap-1.5 text-xs text-[#888888] hover:text-white transition-colors mb-6"
      >
        <ChevronLeft className="w-4 h-4" />
        Powrót do profilu
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Download className="w-5 h-5 text-[#6366F1]" />
        <div>
          <h1 className="font-display text-3xl text-white tracking-wider">IMPORT DANYCH</h1>
          <p className="text-[#888888] text-sm">Połącz konta treningowe, aby automatycznie uzupełnić profil</p>
        </div>
      </div>

      {/* Profile data status */}
      {!loading && userProfile && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-sm text-[#888888] tracking-wider">KOMPLETNOŚĆ PROFILU</h2>
              <p className="text-xs text-[#555555] mt-0.5">{completionCount}/{totalCount} kluczowych pól uzupełnionych</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-2xl font-display text-white">{completionPct}%</div>
              <div className="w-20 h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${completionPct}%`,
                    background: completionPct >= 80 ? '#22C55E' : completionPct >= 50 ? '#EAB308' : '#6366F1',
                  }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { key: 'ftp', label: 'FTP', value: userProfile.ftpWatts ? `${userProfile.ftpWatts}W` : null },
              { key: 'maxHr', label: 'Max HR', value: userProfile.maxHr ? `${userProfile.maxHr} bpm` : null },
              { key: 'pace', label: 'Tempo progowe', value: userProfile.pacePerKm ? formatPace(userProfile.pacePerKm) : null },
              { key: 'weeklyKm', label: 'Tygodniowe km', value: userProfile.weeklyKm ? `${userProfile.weeklyKm}km` : null },
              { key: 'city', label: 'Miasto', value: userProfile.city },
            ].map(({ key, label, value }) => (
              <div
                key={key}
                className="p-3 bg-[var(--bg)] border flex flex-col gap-1"
                style={{ borderColor: value ? '#1A2A1A' : '#2A2A2A' }}
              >
                <div className="flex items-center gap-1.5">
                  {value ? (
                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                  ) : (
                    <Circle className="w-3 h-3 text-[#2A2A2A]" />
                  )}
                  <span className="text-[10px] text-[#555555] uppercase tracking-wider">{label}</span>
                </div>
                <span className="text-xs text-white font-medium">{value ?? '—'}</span>
              </div>
            ))}
          </div>

          {completionPct < 100 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-[#555555]">
                Uzupełnij brakujące dane ręcznie w Strefach Treningowych lub przez import poniżej
              </p>
              <Link href="/training">
                <Button size="sm" variant="outline">
                  Ustaw strefy
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Connected accounts status */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] p-5 mb-6">
        <h2 className="font-display text-sm text-[#888888] tracking-wider mb-4">POŁĄCZONE KONTA</h2>

        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-12 skeleton" />
            ))}
          </div>
        ) : (
          <div>
            <ConnectionStatus
              label="Strava"
              connected={stravaStatus?.connected ?? false}
              detail={stravaStatus?.connected ? `${stravaStatus.activityCount} aktywności` : undefined}
            />
            <ConnectionStatus
              label="Garmin Connect"
              connected={false}
              detail="Wkrótce"
            />
            <ConnectionStatus
              label="Profil treningowy"
              connected={!!userProfile?.ftpWatts || !!userProfile?.maxHr}
              detail="FTP / Max HR"
            />
          </div>
        )}
      </div>

      {/* Manual fallback notice */}
      <div className="bg-[var(--bg)] border border-[var(--border)] p-4 mb-6 flex items-start gap-3">
        <User className="w-4 h-4 text-[#444444] shrink-0 mt-0.5" />
        <div>
          <p className="text-xs text-[#888888] mb-1">
            <span className="text-white">Brak integracji?</span> Bez problemu. Możesz ręcznie wpisać FTP, maks. tętno i tempo w{' '}
            <Link href="/training" className="text-[#6366F1] hover:underline">
              Strefach treningowych
            </Link>
            {' '}lub uzupełnić pełny profil na stronie{' '}
            <Link href="/profile" className="text-[#6366F1] hover:underline">
              Profilu
            </Link>
            .
          </p>
          <p className="text-[10px] text-[#444444]">
            Wszystkie dane wydolnościowe są opcjonalne i służą wyłącznie do poprawy jakości dopasowań i obliczeń stref.
          </p>
        </div>
      </div>

      {/* Import widget */}
      <ImportWidget />
    </div>
  );
}
