'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, RefreshCw, Activity, AlertTriangle } from 'lucide-react';

interface StravaStatus {
  connected: boolean;
  activityCount: number;
  stravaVerified: boolean;
  verifiedPacePerKm: number | null;
}

interface VerifyResult {
  verified: boolean;
  claimedPace: number | null;
  actualPace: number | null;
  diff: number | null;
  message: string;
  runCount?: number;
}

function formatPace(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

export function StravaConnect() {
  const [status, setStatus] = useState<StravaStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/strava/status');
      if (res.ok) {
        const data = await res.json() as StravaStatus;
        setStatus(data);
      }
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  async function handleConnect() {
    // Redirect to Strava OAuth — the server will redirect us
    window.location.href = '/api/strava/connect';
  }

  async function handleSync() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/strava/sync', { method: 'POST' });
      const data = await res.json() as { synced?: number; error?: string };
      if (res.ok) {
        setSyncMessage(`Zsynchronizowano ${data.synced ?? 0} aktywnosci`);
        await fetchStatus();
      } else {
        setSyncMessage(data.error ?? 'Blad synchronizacji');
      }
    } finally {
      setSyncing(false);
    }
  }

  async function handleVerify() {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await fetch('/api/strava/verify', { method: 'POST' });
      const data = await res.json() as VerifyResult;
      setVerifyResult(data);
      await fetchStatus();
    } finally {
      setVerifying(false);
    }
  }

  if (loadingStatus) {
    return (
      <div className="flex items-center gap-2 py-4">
        <div className="w-4 h-4 border-2 border-[#FC4C02] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-[#888888]">Sprawdzanie polaczenia Strava...</span>
      </div>
    );
  }

  if (!status?.connected) {
    return (
      <div className="flex flex-col gap-3">
        <button
          onClick={handleConnect}
          className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ backgroundColor: '#FC4C02' }}
        >
          {/* Strava logo SVG */}
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" xmlns="http://www.w3.org/2000/svg">
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
          </svg>
          Polacz ze Strava
        </button>
        <p className="text-xs text-[#888888]">
          Synchronizuj swoje aktywnosci treningowe ze Strava automatycznie
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Connected status */}
      <div className="flex items-center gap-2">
        <span
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-2xl"
          style={{
            backgroundColor: 'rgba(34,197,94,0.15)',
            color: '#4ade80',
            border: '1px solid rgba(74,222,128,0.3)',
          }}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Strava polaczona
        </span>
        <span className="text-xs text-[#888888]">
          {status.activityCount} aktywnosci
        </span>
      </div>

      {/* Sync button */}
      <div className="flex flex-col gap-2">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2.5 border border-[#FC4C02] text-[#FC4C02] text-sm font-semibold transition-all hover:bg-[rgba(252,76,2,0.1)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Synchronizowanie...' : 'Synchronizuj aktywnosci'}
        </button>
        {syncMessage && (
          <p className="text-xs text-[#888888] pl-1">{syncMessage}</p>
        )}
      </div>

      {/* Pace verification */}
      <div className="border border-[var(--border)] p-4 bg-[var(--bg-card)]">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-[#FC4C02]" />
          <h4 className="text-sm font-semibold text-white">Weryfikacja tempa</h4>
        </div>

        {status.stravaVerified && status.verifiedPacePerKm ? (
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-sm text-green-400">
              Zweryfikowane tempo: {formatPace(status.verifiedPacePerKm)} min/km
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-[#888888]" />
            <span className="text-sm text-[#888888]">Tempo nie zweryfikowane</span>
          </div>
        )}

        <button
          onClick={handleVerify}
          disabled={verifying}
          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
          style={{ backgroundColor: verifying ? '#555' : '#FC4C02' }}
        >
          {verifying ? (
            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Activity className="w-3 h-3" />
          )}
          {verifying ? 'Weryfikowanie...' : 'Zweryfikuj tempo'}
        </button>

        {verifyResult && (
          <div className="mt-3 p-3 border border-[var(--border)] bg-[var(--bg-card)] text-xs space-y-1">
            <div className="flex items-center gap-2">
              {verifyResult.verified ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
              )}
              <span className={verifyResult.verified ? 'text-green-400' : 'text-red-400'}>
                {verifyResult.verified ? 'Tempo zweryfikowane' : 'Tempo nie zweryfikowane'}
              </span>
            </div>
            {verifyResult.actualPace && (
              <p className="text-[#888888]">
                Rzeczywiste tempo: <span className="text-white">{formatPace(verifyResult.actualPace)} min/km</span>
              </p>
            )}
            {verifyResult.claimedPace && (
              <p className="text-[#888888]">
                Zadeklarowane tempo: <span className="text-white">{formatPace(verifyResult.claimedPace)} min/km</span>
              </p>
            )}
            {verifyResult.diff !== null && (
              <p className="text-[#888888]">
                Roznica: <span className="text-white">{verifyResult.diff}s/km</span>
              </p>
            )}
            {verifyResult.runCount !== undefined && (
              <p className="text-[#666666]">
                Na podstawie {verifyResult.runCount} biegów (ostatnie 90 dni)
              </p>
            )}
            <p className="text-[#666666] italic">{verifyResult.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
