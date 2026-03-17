'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  PersonStanding,
  Bike,
  Waves,
  RefreshCw,
  Trophy,
  Footprints,
  ChevronRight,
  Loader2,
} from 'lucide-react';

interface StravaTotals {
  count: number;
  distance: number;
  moving_time: number;
  elevation_gain: number;
  achievement_count?: number;
}

interface StravaStatsJson {
  recent_run_totals: StravaTotals;
  recent_ride_totals: StravaTotals;
  recent_swim_totals: StravaTotals;
  ytd_run_totals: StravaTotals;
  ytd_ride_totals: StravaTotals;
  ytd_swim_totals: StravaTotals;
  all_run_totals: StravaTotals;
  all_ride_totals: StravaTotals;
  all_swim_totals: StravaTotals;
  biggest_ride_distance: number;
  biggest_climb_elevation_gain: number;
}

interface StravaGearItem {
  id: number;
  gearType: string;
  name: string;
  brandName: string | null;
  modelName: string | null;
  distanceM: number | null;
  isDefault: boolean | null;
}

interface StravaBestEffort {
  id: number;
  effortName: string;
  distanceM: number;
  movingTimeSec: number;
  startDate: string | null;
}

interface StravaStatsData {
  stats: StravaStatsJson | null;
  gear: {
    bikes: StravaGearItem[];
    shoes: StravaGearItem[];
  };
  bestEfforts: StravaBestEffort[];
  activityCount: number;
}

function formatKm(distanceM: number | undefined | null): string {
  if (!distanceM) return '0 km';
  return `${(distanceM / 1000).toFixed(0)} km`;
}

function formatBigKm(distanceM: number | undefined | null): string {
  if (!distanceM) return '—';
  return `${(distanceM / 1000).toFixed(1)} km`;
}

function formatTime(sec: number | undefined | null): string {
  if (!sec) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

function formatPace(sec: number | null): string {
  if (!sec) return '—';
  const min = Math.floor(sec / 60);
  const s = sec % 60;
  return `${min}:${String(s).padStart(2, '0')}`;
}

function StatBlock({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color?: string;
}) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && <Icon className="w-3.5 h-3.5" style={{ color: color ?? '#888888' }} />}
        <span className="text-[10px] text-[#888888] uppercase tracking-wider">{label}</span>
      </div>
      <span className="font-display text-xl text-white leading-none">{value}</span>
      {sub && <span className="text-xs text-[#888888] mt-0.5">{sub}</span>}
    </div>
  );
}

function TotalsSection({
  label,
  run,
  ride,
  swim,
}: {
  label: string;
  run?: StravaTotals;
  ride?: StravaTotals;
  swim?: StravaTotals;
}) {
  const hasData = (run?.distance ?? 0) > 0 || (ride?.distance ?? 0) > 0 || (swim?.distance ?? 0) > 0;
  if (!hasData) return null;

  return (
    <div>
      <h4 className="text-xs text-[#888888] uppercase tracking-widest mb-3 font-semibold">{label}</h4>
      <div className="grid grid-cols-3 gap-3">
        {(run?.distance ?? 0) > 0 && (
          <StatBlock
            label="Run"
            value={formatKm(run?.distance)}
            sub={`${run?.count ?? 0} activities`}
            icon={PersonStanding}
            color="#2DD4BF"
          />
        )}
        {(ride?.distance ?? 0) > 0 && (
          <StatBlock
            label="Ride"
            value={formatKm(ride?.distance)}
            sub={`${ride?.count ?? 0} activities`}
            icon={Bike}
            color="#FC4C02"
          />
        )}
        {(swim?.distance ?? 0) > 0 && (
          <StatBlock
            label="Swim"
            value={formatKm(swim?.distance)}
            sub={`${swim?.count ?? 0} activities`}
            icon={Waves}
            color="#60A5FA"
          />
        )}
      </div>
    </div>
  );
}

interface StravaStatsCardProps {
  onSync?: () => void;
  showSyncButton?: boolean;
}

export function StravaStatsCard({ onSync, showSyncButton = false }: StravaStatsCardProps) {
  const [data, setData] = useState<StravaStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'recent' | 'ytd' | 'alltime'>('recent');

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/strava/stats');
      if (res.ok) {
        const json = await res.json() as StravaStatsData;
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch('/api/strava/sync', { method: 'POST' });
      await fetchStats();
      onSync?.();
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border)] p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-5 h-5 bg-[#FC4C02] rounded-sm animate-pulse" />
          <div className="h-4 w-32 skeleton" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 skeleton" />
          ))}
        </div>
      </div>
    );
  }

  if (!data?.stats) {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border)] p-6 text-center">
        <div className="w-10 h-10 bg-[#FC4C02] rounded-full flex items-center justify-center mx-auto mb-3 opacity-30">
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
          </svg>
        </div>
        <p className="text-[#888888] text-sm">No Strava stats yet.</p>
        <p className="text-[#555555] text-xs mt-1">Connect Strava and sync to see your stats.</p>
      </div>
    );
  }

  const { stats, gear, bestEfforts, activityCount } = data;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#FC4C02] rounded-sm flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
            </svg>
          </div>
          <div>
            <h3 className="font-display text-white text-base tracking-wider">STRAVA STATS</h3>
            <p className="text-[10px] text-[#888888]">{activityCount} activities synced</p>
          </div>
        </div>
        {showSyncButton && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[#FC4C02] text-[#FC4C02] hover:bg-[rgba(252,76,2,0.1)] transition-all disabled:opacity-50"
          >
            {syncing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            Sync
          </button>
        )}
      </div>

      {/* Period tabs */}
      <div className="flex border-b border-[var(--border)]">
        {(['recent', 'ytd', 'alltime'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all"
            style={
              activeTab === tab
                ? { borderColor: '#FC4C02', color: '#FC4C02' }
                : { borderColor: 'transparent', color: '#888888' }
            }
          >
            {tab === 'recent' ? 'Recent' : tab === 'ytd' ? 'This Year' : 'All Time'}
          </button>
        ))}
      </div>

      {/* Stats by period */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] p-4">
        {activeTab === 'recent' && (
          <TotalsSection
            label="Last 4 weeks"
            run={stats.recent_run_totals}
            ride={stats.recent_ride_totals}
            swim={stats.recent_swim_totals}
          />
        )}
        {activeTab === 'ytd' && (
          <TotalsSection
            label="Year to date"
            run={stats.ytd_run_totals}
            ride={stats.ytd_ride_totals}
            swim={stats.ytd_swim_totals}
          />
        )}
        {activeTab === 'alltime' && (
          <div className="flex flex-col gap-4">
            <TotalsSection
              label="All time"
              run={stats.all_run_totals}
              ride={stats.all_ride_totals}
              swim={stats.all_swim_totals}
            />
            {(stats.biggest_ride_distance ?? 0) > 0 && (
              <div className="pt-3 border-t border-[var(--border)]">
                <h4 className="text-xs text-[#888888] uppercase tracking-widest mb-3 font-semibold">Records</h4>
                <div className="grid grid-cols-2 gap-3">
                  <StatBlock
                    label="Biggest Ride"
                    value={formatBigKm(stats.biggest_ride_distance)}
                    icon={Bike}
                    color="#FC4C02"
                  />
                  {(stats.biggest_climb_elevation_gain ?? 0) > 0 && (
                    <StatBlock
                      label="Biggest Climb"
                      value={`${Math.round(stats.biggest_climb_elevation_gain)}m`}
                      icon={ChevronRight}
                      color="#A78BFA"
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Best Efforts */}
      {bestEfforts.length > 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] p-4">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <h4 className="font-display text-sm text-white tracking-wider">PERSONAL BESTS</h4>
          </div>
          <div className="flex flex-col gap-2">
            {bestEfforts.map(effort => (
              <div
                key={effort.id}
                className="flex items-center justify-between py-2 border-b border-[#0D0D0D] last:border-0"
              >
                <div className="flex items-center gap-2">
                  <PersonStanding className="w-3.5 h-3.5 text-[#2DD4BF]" />
                  <span className="text-sm text-[#888888]">{effort.effortName}</span>
                </div>
                <div className="text-right">
                  <span className="font-display text-white text-sm">{formatPace(effort.movingTimeSec)}</span>
                  {effort.startDate && (
                    <p className="text-[10px] text-[#555555]">
                      {new Date(effort.startDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gear */}
      {(gear.bikes.length > 0 || gear.shoes.length > 0) && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] p-4">
          <h4 className="font-display text-sm text-white tracking-wider mb-4">GEAR</h4>

          {gear.bikes.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Bike className="w-3.5 h-3.5 text-[#FC4C02]" />
                <span className="text-xs text-[#888888] uppercase tracking-wider">Bikes</span>
              </div>
              <div className="flex flex-col gap-2">
                {gear.bikes.map(bike => (
                  <div key={bike.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {bike.isDefault && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FC4C02] flex-shrink-0" />
                      )}
                      <div>
                        <p className="text-sm text-white">{bike.name}</p>
                        {(bike.brandName || bike.modelName) && (
                          <p className="text-[10px] text-[#555555]">
                            {[bike.brandName, bike.modelName].filter(Boolean).join(' ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-white">
                      {formatBigKm(bike.distanceM)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {gear.shoes.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Footprints className="w-3.5 h-3.5 text-[#2DD4BF]" />
                <span className="text-xs text-[#888888] uppercase tracking-wider">Shoes</span>
              </div>
              <div className="flex flex-col gap-2">
                {gear.shoes.map(shoe => (
                  <div key={shoe.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {shoe.isDefault && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2DD4BF] flex-shrink-0" />
                      )}
                      <div>
                        <p className="text-sm text-white">{shoe.name}</p>
                        {(shoe.brandName || shoe.modelName) && (
                          <p className="text-[10px] text-[#555555]">
                            {[shoe.brandName, shoe.modelName].filter(Boolean).join(' ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-white">
                      {formatBigKm(shoe.distanceM)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Moving time summary */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] p-4">
        <h4 className="font-display text-xs text-[#888888] tracking-widest mb-3 uppercase">Time on feet (all time)</h4>
        <div className="grid grid-cols-3 gap-3">
          {(stats.all_run_totals?.moving_time ?? 0) > 0 && (
            <StatBlock
              label="Running"
              value={formatTime(stats.all_run_totals.moving_time)}
              icon={PersonStanding}
              color="#2DD4BF"
            />
          )}
          {(stats.all_ride_totals?.moving_time ?? 0) > 0 && (
            <StatBlock
              label="Cycling"
              value={formatTime(stats.all_ride_totals.moving_time)}
              icon={Bike}
              color="#FC4C02"
            />
          )}
          {(stats.all_swim_totals?.moving_time ?? 0) > 0 && (
            <StatBlock
              label="Swimming"
              value={formatTime(stats.all_swim_totals.moving_time)}
              icon={Waves}
              color="#60A5FA"
            />
          )}
        </div>
      </div>
    </div>
  );
}
