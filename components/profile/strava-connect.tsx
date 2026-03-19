'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, RefreshCw, Activity, AlertTriangle, User } from 'lucide-react';
import { useLang } from '@/lib/lang';

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

interface SyncResult {
  synced?: number;
  pagesChecked?: number;
  error?: string;
}

function formatPace(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

export function StravaConnect() {
  const { t } = useLang();
  const [status, setStatus] = useState<StravaStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [refreshingProfile, setRefreshingProfile] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

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
    window.location.href = '/api/strava/connect';
  }

  async function handleSync() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/strava/sync', { method: 'POST' });
      const data = await res.json() as SyncResult;
      if (res.ok) {
        setSyncMessage(t('strava_synced', { count: String(data.synced ?? 0) }));
        await fetchStatus();
      } else {
        setSyncMessage(data.error ?? t('strava_sync_error'));
      }
    } finally {
      setSyncing(false);
    }
  }

  async function handleRefreshProfile() {
    setRefreshingProfile(true);
    setProfileMessage(null);
    try {
      // Sync pulls fresh athlete data (avatar, city) + stats + gear + activities
      const res = await fetch('/api/strava/sync', { method: 'POST' });
      const data = await res.json() as SyncResult;
      if (res.ok) {
        setProfileMessage(t('strava_profile_updated', { count: String(data.synced ?? 0) }));
        await fetchStatus();
        // Reload page so avatar/city changes are visible
        setTimeout(() => window.location.reload(), 800);
      } else {
        setProfileMessage(data.error ?? t('strava_refresh_error'));
      }
    } finally {
      setRefreshingProfile(false);
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
        <span className="text-sm text-[#888888]">{t('strava_checking')}</span>
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
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" xmlns="http://www.w3.org/2000/svg">
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
          </svg>
          {t('strava_connect')}
        </button>
        <p className="text-xs text-[#888888]">
          {t('strava_desc')}
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
          {t('strava_connected')}
        </span>
        <span className="text-xs text-[#888888]">
          {status.activityCount} {t('strava_activities')}
        </span>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {/* Refresh profile button — primary action */}
        <button
          onClick={handleRefreshProfile}
          disabled={refreshingProfile || syncing}
          className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#FC4C02' }}
        >
          {refreshingProfile ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <User className="w-4 h-4" />
          )}
          {refreshingProfile ? t('strava_refreshing') : t('strava_refresh')}
        </button>

        {/* Sync activities */}
        <button
          onClick={handleSync}
          disabled={syncing || refreshingProfile}
          className="flex items-center justify-center gap-2 px-4 py-2.5 border border-[#FC4C02] text-[#FC4C02] text-sm font-semibold transition-all hover:bg-[rgba(252,76,2,0.1)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? t('strava_syncing') : t('strava_sync')}
        </button>
      </div>

      {/* Messages */}
      {profileMessage && (
        <p className="text-xs text-green-400 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
          {profileMessage}
        </p>
      )}
      {syncMessage && !profileMessage && (
        <p className="text-xs text-[#888888] pl-1">{syncMessage}</p>
      )}

      {/* What gets refreshed info */}
      <div className="text-[10px] text-[#555555] leading-5">
        <span className="text-[#888888] font-semibold">{t('strava_refresh_info')}</span> — {t('strava_refresh_desc')}<br />
        <span className="text-[#888888] font-semibold">{t('strava_sync')}</span> — {t('strava_sync_desc')}
      </div>

      {/* Pace verification */}
      <div className="border border-[var(--border)] p-4 bg-[var(--bg-card)]">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-[#FC4C02]" />
          <h4 className="text-sm font-semibold text-white">{t('strava_pace_verify')}</h4>
        </div>

        {status.stravaVerified && status.verifiedPacePerKm ? (
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-sm text-green-400">
              {t('strava_pace_verified')} {formatPace(status.verifiedPacePerKm)} min/km
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-[#888888]" />
            <span className="text-sm text-[#888888]">{t('strava_pace_not_verified')}</span>
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
          {verifying ? t('strava_verifying') : t('strava_verify')}
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
                {verifyResult.verified ? t('strava_verified_label') : t('strava_not_verified_label')}
              </span>
            </div>
            {verifyResult.actualPace && (
              <p className="text-[#888888]">
                {t('strava_actual_pace')} <span className="text-white">{formatPace(verifyResult.actualPace)} min/km</span>
              </p>
            )}
            {verifyResult.claimedPace && (
              <p className="text-[#888888]">
                {t('strava_claimed_pace')} <span className="text-white">{formatPace(verifyResult.claimedPace)} min/km</span>
              </p>
            )}
            {verifyResult.diff !== null && (
              <p className="text-[#888888]">
                {t('strava_diff')} <span className="text-white">{verifyResult.diff}s/km</span>
              </p>
            )}
            {verifyResult.runCount !== undefined && (
              <p className="text-[#666666]">
                {t('strava_based_on', { count: String(verifyResult.runCount) })}
              </p>
            )}
            <p className="text-[#666666] italic">{verifyResult.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
