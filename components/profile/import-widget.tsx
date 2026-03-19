'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLang } from '@/lib/lang';
import {
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Link2,
  Unlink,
  Info,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StravaStatus {
  connected: boolean;
  activityCount: number;
  stravaVerified: boolean;
  verifiedPacePerKm: number | null;
}

interface ImportResult {
  success: boolean;
  partial?: boolean;
  needsConnect?: boolean;
  needsReconnect?: boolean;
  athleteId?: string | number;
  athleteName?: string;
  city?: string | null;
  ftp?: number | null;
  importedProfiles?: Array<Record<string, unknown>>;
  stats?: {
    recentRunKm: number;
    recentRideKm: number;
    allRunCount: number;
    allRideCount: number;
    ytdRunKm: number;
    ytdRideKm: number;
  };
  message: string;
  connectUrl?: string;
  profileUrl?: string;
  instructions?: string[];
  error?: string;
}

function StravaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
  );
}

function GarminIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c3.87 0 7 3.13 7 7s-3.13 7-7 7-7-3.13-7-7 3.13-7 7-7zm0 2a5 5 0 100 10A5 5 0 0012 7zm0 2a3 3 0 110 6 3 3 0 010-6z" />
    </svg>
  );
}

// ─── Garmin Import Section ────────────────────────────────────────────────────
type GarminMode = 'url' | 'cookies';

interface GarminResult {
  success?: boolean;
  requiresLogin?: boolean;
  message?: string;
  weeklyKm?: number | null;
  vo2max?: number | null;
  avgSpeedKmh?: number | null;
  displayName?: string;
  source?: string;
  cookiesInstructions?: string;
}

function GarminImportSection({ garminUrl, setGarminUrl }: { garminUrl: string; setGarminUrl: (v: string) => void }) {
  const { t } = useLang();
  const [mode, setMode] = useState<GarminMode>('url');
  const [cookies, setCookies] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GarminResult | null>(null);
  const [showCookieHelp, setShowCookieHelp] = useState(false);

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const body = mode === 'cookies'
        ? { mode: 'cookies', cookies }
        : { mode: 'url', garminProfileUrl: garminUrl };

      const res = await fetch('/api/garmin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json() as GarminResult;
      setResult(data);
    } catch {
      setResult({ message: t('garmin_conn_error') });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] p-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-[#005AA9] flex items-center justify-center">
          <GarminIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-white font-medium text-sm">{t('garmin_import_title')}</h3>
          <p className="text-[10px] text-[#555555]">{t('garmin_import_subtitle')}</p>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 mb-4 p-1 bg-[var(--bg)] border border-[var(--border)]">
        {(['url', 'cookies'] as GarminMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setResult(null); }}
            className="flex-1 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all"
            style={mode === m
              ? { background: '#005AA9', color: 'white' }
              : { background: 'transparent', color: '#555' }}
          >
            {m === 'url' ? t('garmin_tab_url') : t('garmin_tab_cookies')}
          </button>
        ))}
      </div>

      <form onSubmit={handleImport}>
        {mode === 'url' ? (
          <div>
            <label className="block text-xs text-[#888888] uppercase tracking-wider mb-1.5">
              {t('garmin_url_label')}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={garminUrl}
                onChange={(e) => setGarminUrl(e.target.value)}
                placeholder="https://connect.garmin.com/modern/profile/twojanazwa"
                className="flex-1 bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2 text-sm focus:outline-none focus:border-[#005AA9] transition-colors"
              />
              <Button type="submit" size="sm" disabled={loading || !garminUrl.trim()} className="shrink-0"
                style={{ background: '#005AA9', borderColor: '#005AA9' }}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Import'}
              </Button>
            </div>
            <p className="text-[10px] text-[#555555] mt-1.5">
              {t('garmin_url_public_note')}
            </p>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-[#888888] uppercase tracking-wider">Session cookies</label>
              <button type="button" onClick={() => setShowCookieHelp(v => !v)}
                className="text-[10px] text-[#005AA9] hover:text-blue-300 flex items-center gap-1">
                <Info className="w-3 h-3" /> {t('garmin_cookies_how')}
              </button>
            </div>

            {showCookieHelp && (
              <div className="mb-3 p-3 bg-[var(--bg)] border border-[var(--border)] text-xs text-[#888888] space-y-1">
                <p className="font-semibold text-white mb-2">{t('garmin_cookies_step_title')}</p>
                <p>1. {t('garmin_cookies_step1')}</p>
                <p>2. {t('garmin_cookies_step2')}</p>
                <p>3. {t('garmin_cookies_step3')}</p>
                <p>4. {t('garmin_cookies_step4')}</p>
              </div>
            )}

            <textarea
              value={cookies}
              onChange={(e) => setCookies(e.target.value)}
              placeholder="GARMIN-SSO-GUID=abc123; JWT_FG=xyz789; SESSIONID=..."
              rows={3}
              className="w-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#005AA9] transition-colors mb-2 resize-none"
            />
            <Button type="submit" size="sm" disabled={loading || !cookies.trim()} className="w-full"
              style={{ background: '#005AA9', borderColor: '#005AA9' }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><GarminIcon className="w-4 h-4" /> {t('garmin_import_btn')}</>}
            </Button>
          </div>
        )}
      </form>

      {/* Result */}
      {result && (
        <div className={`mt-4 p-3 border text-sm ${result.success ? 'border-green-500/30 bg-green-500/10' : 'border-[var(--border)] bg-[var(--bg)]'}`}>
          {result.success ? (
            <div className="flex flex-col gap-1 text-xs">
              <div className="flex items-center gap-2 text-green-400 font-semibold mb-1">
                <CheckCircle2 className="w-4 h-4" /> {t('garmin_import_done')}
              </div>
              {result.displayName && <span className="text-[#888888]">{t('garmin_import_account')} <span className="text-white">{result.displayName}</span></span>}
              {result.weeklyKm && <span className="text-[#888888]">{t('garmin_import_weekly')} <span className="text-white">{result.weeklyKm} km</span></span>}
              {result.vo2max && <span className="text-[#888888]">VO2max: <span className="text-white">{result.vo2max}</span></span>}
              {result.avgSpeedKmh && <span className="text-[#888888]">{t('garmin_import_avg_speed')} <span className="text-white">{result.avgSpeedKmh} km/h</span></span>}
            </div>
          ) : (
            <div className="text-xs text-[#888888]">
              <AlertCircle className="w-4 h-4 text-yellow-500 inline mr-1.5" />
              {result.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ImportResultCard({ result, onDismiss }: { result: ImportResult; onDismiss: () => void }) {
  const { t } = useLang();
  return (
    <div
      className={`p-4 border mt-4 ${
        result.success
          ? 'border-green-500/30 bg-green-500/5'
          : result.partial || result.needsConnect
          ? 'border-yellow-500/30 bg-yellow-500/5'
          : 'border-red-500/30 bg-red-500/5'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 flex-1">
          {result.success ? (
            <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white mb-2">{result.message}</p>

            {result.success && result.stats && (
              <div className="grid grid-cols-2 gap-2 mb-2">
                {result.athleteName && (
                  <div className="col-span-2 text-xs text-[#888888]">
                    {t('gen_athlete')}: <span className="text-white">{result.athleteName}</span>
                    {result.city && <span className="text-[#555555]"> · {result.city}</span>}
                  </div>
                )}
                {result.ftp && (
                  <div className="text-xs text-[#888888]">
                    FTP: <span className="text-white">{result.ftp}W</span>
                  </div>
                )}
                {result.stats.ytdRunKm > 0 && (
                  <div className="text-xs text-[#888888]">
                    {t('strava_year_run')} <span className="text-white">{result.stats.ytdRunKm}km</span>
                  </div>
                )}
                {result.stats.ytdRideKm > 0 && (
                  <div className="text-xs text-[#888888]">
                    {t('strava_year_ride')} <span className="text-white">{result.stats.ytdRideKm}km</span>
                  </div>
                )}
                {result.stats.recentRunKm > 0 && (
                  <div className="text-xs text-[#888888]">
                    {t('strava_recent_run')} <span className="text-white">{result.stats.recentRunKm}km</span>
                  </div>
                )}
              </div>
            )}

            {result.instructions && (
              <ul className="text-xs text-[#888888] space-y-1 mt-2">
                {result.instructions.map((instr, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-[#6366F1] shrink-0">{i + 1}.</span>
                    {instr}
                  </li>
                ))}
              </ul>
            )}

            {result.needsConnect && result.connectUrl && (
              <a
                href={result.connectUrl}
                className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-[#FC4C02] text-white text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                <StravaIcon className="w-3.5 h-3.5" />
                {t('strava_connect_strava')}
                <ArrowRight className="w-3 h-3" />
              </a>
            )}

            {result.profileUrl && (
              <a
                href={result.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-[#888888] hover:text-white transition-colors"
              >
                {t('strava_view_profile')}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-[#444444] hover:text-[#888888] transition-colors shrink-0 text-lg leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}

function StravaSyncSection({ onSyncComplete }: { onSyncComplete: () => void }) {
  const { t } = useLang();
  const [syncing, setSyncing] = useState(false);
  const [stage, setStage] = useState('');
  const [result, setResult] = useState<{ synced: number; pagesChecked: number } | null>(null);
  const [error, setError] = useState('');

  async function handleSync() {
    setSyncing(true);
    setResult(null);
    setError('');

    // Show progressive stages to give feedback during long sync
    setStage(t('strava_sync_stage1'));
    const stageTimer1 = setTimeout(() => setStage(t('strava_sync_stage2')), 3000);
    const stageTimer2 = setTimeout(() => setStage(t('strava_sync_stage3')), 6000);
    const stageTimer3 = setTimeout(() => setStage(t('strava_sync_stage4')), 12000);

    try {
      const res = await fetch('/api/strava/sync', { method: 'POST' });
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);

      if (res.ok) {
        const data = await res.json() as { synced: number; pagesChecked: number };
        setResult(data);
        onSyncComplete();
      } else {
        const body = await res.json().catch(() => ({})) as { error?: string };
        setError(body.error ?? t('strava_sync_error'));
      }
    } catch {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);
      setError(t('strava_sync_error_conn'));
    } finally {
      setSyncing(false);
      setStage('');
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-[var(--border)]">
      <button
        onClick={handleSync}
        disabled={syncing}
        className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
        style={{ background: '#FC4C02' }}
      >
        {syncing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {stage}
          </>
        ) : (
          <>
            <StravaIcon className="w-4 h-4" />
            {t('strava_sync_title')}
          </>
        )}
      </button>

      {syncing && (
        <div className="mt-3">
          <div className="w-full h-1.5 bg-[var(--bg)] overflow-hidden">
            <div
              className="h-full transition-all"
              style={{
                background: '#FC4C02',
                animation: 'syncProgress 15s ease-out forwards',
              }}
            />
          </div>
          <style>{`@keyframes syncProgress { 0% { width: 5%; } 20% { width: 25%; } 50% { width: 55%; } 80% { width: 80%; } 100% { width: 95%; } }`}</style>
        </div>
      )}

      {result && (
        <div className="mt-3 p-3 border border-green-500/30 bg-green-500/10 text-xs">
          <div className="flex items-center gap-2 text-green-400 font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            {t('strava_sync_done')}
          </div>
          <p className="text-[#888888] mt-1">
            {t('strava_sync_count', {
              count: String(result.synced),
              pages: String(result.pagesChecked),
              pagesLabel: result.pagesChecked === 1 ? t('strava_sync_page') : t('strava_sync_pages'),
            })}
          </p>
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 border border-red-500/30 bg-red-500/10 text-xs">
          <AlertCircle className="w-4 h-4 text-red-400 inline mr-1.5" />
          <span className="text-[#888888]">{error}</span>
        </div>
      )}
    </div>
  );
}

export function ImportWidget() {
  const { t } = useLang();
  const [stravaUrl, setStravaUrl] = useState('');
  const [garminUrl, setGarminUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [stravaResult, setStravaResult] = useState<ImportResult | null>(null);
  const [stravaStatus, setStravaStatus] = useState<StravaStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const fetchStravaStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/strava/status');
      if (res.ok) {
        setStravaStatus(await res.json() as StravaStatus);
      }
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    fetchStravaStatus();
  }, [fetchStravaStatus]);

  async function handleStravaImport(e: React.FormEvent) {
    e.preventDefault();
    if (!stravaUrl.trim()) return;

    setImporting(true);
    setStravaResult(null);
    try {
      const res = await fetch('/api/strava/import-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stravaUrl: stravaUrl.trim() }),
      });

      const data = await res.json() as ImportResult;
      setStravaResult(data);

      if (data.success) {
        await fetchStravaStatus();
      }
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Strava section */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-[#FC4C02] flex items-center justify-center">
            <StravaIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-medium text-sm">{t('strava_import_title')}</h3>
            <p className="text-[10px] text-[#555555]">{t('strava_import_subtitle')}</p>
          </div>
          {loadingStatus ? (
            <Loader2 className="w-4 h-4 text-[#555555] animate-spin ml-auto" />
          ) : stravaStatus?.connected ? (
            <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 border border-green-500/30 bg-green-500/10">
              <Link2 className="w-3 h-3 text-green-400" />
              <span className="text-xs text-green-400 font-medium">{t('strava_connected_badge')}</span>
            </div>
          ) : (
            <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 border border-[var(--border)] bg-[var(--bg)]">
              <Unlink className="w-3 h-3 text-[#555555]" />
              <span className="text-xs text-[#555555]">{t('strava_not_connected_badge')}</span>
            </div>
          )}
        </div>

        {/* Connected status details */}
        {stravaStatus?.connected && (
          <div className="mb-4 p-3 bg-[var(--bg)] border border-[var(--border)] flex items-center justify-between">
            <div className="text-xs text-[#888888]">
              <span className="text-white font-medium">{stravaStatus.activityCount}</span> {t('strava_activities_synced')}
              {stravaStatus.stravaVerified && (
                <span className="ml-3 flex items-center gap-1 text-green-400 inline-flex">
                  <CheckCircle2 className="w-3 h-3" />
                  {t('strava_tempo_verified')}
                </span>
              )}
            </div>
            <a
              href="/api/strava/connect"
              className="text-xs text-[#FC4C02] hover:underline"
            >
              {t('strava_reconnect')}
            </a>
          </div>
        )}

        {/* Import by URL */}
        <form onSubmit={handleStravaImport}>
          <label className="block text-xs text-[#888888] uppercase tracking-wider mb-1.5">
            {t('strava_url_label')}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={stravaUrl}
              onChange={(e) => setStravaUrl(e.target.value)}
              placeholder="https://www.strava.com/athletes/12345"
              className="flex-1 bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] px-3 py-2 text-sm focus:outline-none focus:border-[#FC4C02] transition-colors"
            />
            <Button
              type="submit"
              size="sm"
              disabled={importing || !stravaUrl.trim()}
              className="shrink-0"
              style={{ background: '#FC4C02', borderColor: '#FC4C02' }}
            >
              {importing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <StravaIcon className="w-4 h-4" />
                  Import
                </>
              )}
            </Button>
          </div>
          <p className="text-[10px] text-[#555555] mt-1.5">
            {t('strava_url_note')}{' '}
            <a href="/api/strava/connect" className="text-[#FC4C02] hover:underline">
              {t('strava_connect_account')}
            </a>
            .
          </p>
        </form>

        {/* Sync button for connected users */}
        {stravaStatus?.connected && !loadingStatus && (
          <StravaSyncSection onSyncComplete={fetchStravaStatus} />
        )}

        {/* Connect OAuth button (if not connected) */}
        {!stravaStatus?.connected && !loadingStatus && (
          <div className="mt-4 pt-4 border-t border-[var(--border)]">
            <a
              href="/api/strava/connect"
              className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: '#FC4C02' }}
            >
              <StravaIcon className="w-4 h-4" />
              {t('strava_connect_oauth')}
              <ArrowRight className="w-4 h-4" />
            </a>
            <p className="text-[10px] text-[#555555] mt-2 text-center">
              {t('strava_oauth_desc')}
            </p>
          </div>
        )}

        {stravaResult && (
          <ImportResultCard
            result={stravaResult}
            onDismiss={() => setStravaResult(null)}
          />
        )}
      </div>

      {/* Garmin section — full implementation */}
      <GarminImportSection garminUrl={garminUrl} setGarminUrl={setGarminUrl} />
    </div>
  );
}
