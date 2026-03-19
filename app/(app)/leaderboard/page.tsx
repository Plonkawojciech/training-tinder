'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Trophy, Route, Dumbbell, Crown, TrendingUp, Zap } from 'lucide-react';
import { getSportLabel } from '@/lib/utils';
import { useLang } from '@/lib/lang';

interface LeaderboardEntry {
  rank: number;
  id: string;
  username: string | null;
  avatarUrl: string | null;
  sportTypes: string[];
  weeklyKm: number;
  sessionCount: number;
  city: string | null;
  isCurrentUser: boolean;
}

type SortBy = 'weeklyKm' | 'sessions';
type TimeRange = 'week' | 'month' | 'all';

const RANK_COLORS = ['#F59E0B', '#94A3B8', '#D97706'] as const;
const SPORT_OPTIONS = ['all', 'cycling', 'running', 'gym', 'swimming', 'triathlon'] as const;

function getRankColor(rank: number): string {
  if (rank <= 3) return RANK_COLORS[rank - 1];
  return 'var(--text-muted)';
}

export default function LeaderboardPage() {
  const { t } = useLang();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortBy>('weeklyKm');
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [sportFilter, setSportFilter] = useState<string>('all');

  useEffect(() => {
    let cancelled = false;
    const params = timeRange !== 'all' ? `?period=${timeRange}` : '';
    fetch(`/api/leaderboard${params}`)
      .then(r => r.ok ? r.json() : [])
      .then((data: LeaderboardEntry[]) => {
        if (!cancelled) {
          setEntries(data);
          setLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [timeRange]);

  const filtered = entries.filter(e =>
    sportFilter === 'all' || e.sportTypes.includes(sportFilter)
  );

  const sorted = [...filtered].sort((a, b) =>
    sortBy === 'weeklyKm' ? b.weeklyKm - a.weeklyKm : b.sessionCount - a.sessionCount
  );

  const tabs: { key: SortBy; label: string; icon: React.ElementType; unit: string }[] = [
    { key: 'weeklyKm',  label: t('leaderboard_distance'), icon: Route,    unit: 'km/tydz.' },
    { key: 'sessions',  label: t('leaderboard_workouts'),           icon: Dumbbell, unit: 'sesji'    },
  ]

  const activeTab = tabs.find(t => t.key === sortBy)!;

  return (
    <div style={{ padding: '0 0 80px', maxWidth: 680, margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ padding: '28px 20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <Trophy size={18} style={{ color: 'var(--accent)' }} />
          <h1 style={{ fontFamily: 'Syne, Inter, sans-serif', fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1 }}>
            {t('leaderboard_title')}
          </h1>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('leaderboard_subtitle')}</p>
      </div>

      {/* Sort tabs */}
      <div style={{ display: 'flex', gap: 4, margin: '0 20px 24px', background: 'var(--bg-elevated)', borderRadius: 12, padding: 3 }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = sortBy === tab.key;
          return (
            <button key={tab.key} onClick={() => setSortBy(tab.key)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, letterSpacing: '0.02em',
                background: active ? 'var(--bg-card)' : 'transparent',
                color: active ? 'var(--text)' : 'var(--text-muted)',
                boxShadow: active ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
                transition: 'all 0.15s',
              }}>
              <Icon size={13} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Time range + Sport filter */}
      <div style={{ display: 'flex', gap: 8, margin: '0 20px 16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-elevated)', borderRadius: 8, padding: 2 }}>
          {(['week', 'month', 'all'] as TimeRange[]).map(tr => (
            <button key={tr} onClick={() => setTimeRange(tr)}
              style={{
                padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: 600,
                background: timeRange === tr ? 'var(--bg-card)' : 'transparent',
                color: timeRange === tr ? 'var(--text)' : 'var(--text-muted)',
                transition: 'all 0.15s',
              }}>
              {tr === 'week' ? t('lb_week') : tr === 'month' ? t('lb_month') : t('lb_all_time')}
            </button>
          ))}
        </div>
        <select
          value={sportFilter}
          onChange={e => setSportFilter(e.target.value)}
          style={{
            padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--bg-elevated)', color: 'var(--text)',
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}
        >
          {SPORT_OPTIONS.map(s => (
            <option key={s} value={s}>
              {s === 'all' ? t('lb_all_sports') : getSportLabel(s)}
            </option>
          ))}
        </select>
      </div>

      {/* Podium (top 3) */}
      {!loading && sorted.length >= 3 && (
        <div style={{ margin: '0 20px 24px' }}>
          <div style={{ display: 'flex', fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 14, alignItems: 'center', gap: 6 }}>
            <TrendingUp size={11} /> {t('leaderboard_top3')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr 1fr', gap: 8, alignItems: 'end' }}>
            {/* 2nd */}
            <Link href={`/profile/${sorted[1].id}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '16px 12px', textAlign: 'center', marginBottom: 0, marginTop: 20 }}>
                <Crown size={16} style={{ color: RANK_COLORS[1], margin: '0 auto 8px' }} />
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-elevated)', border: `2px solid ${RANK_COLORS[1]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', overflow: 'hidden' }}>
                  {sorted[1].avatarUrl ? <Image src={sorted[1].avatarUrl} alt="" width={48} height={48} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontWeight: 700, fontSize: 18, color: RANK_COLORS[1] }}>{(sorted[1].username ?? '?')[0]?.toUpperCase()}</span>}
                </div>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sorted[1].username}</p>
                <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: RANK_COLORS[1], letterSpacing: '-0.02em' }}>
                  {sortBy === 'weeklyKm' ? sorted[1].weeklyKm : sorted[1].sessionCount}
                </p>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{activeTab.unit}</p>
              </div>
            </Link>

            {/* 1st */}
            <Link href={`/profile/${sorted[0].id}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: 'var(--bg-card)', border: `1.5px solid ${RANK_COLORS[0]}`, padding: '20px 12px 16px', textAlign: 'center', boxShadow: `0 4px 20px ${RANK_COLORS[0]}28` }}>
                <Crown size={20} style={{ color: RANK_COLORS[0], margin: '0 auto 10px' }} />
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--bg-elevated)', border: `2px solid ${RANK_COLORS[0]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', overflow: 'hidden' }}>
                  {sorted[0].avatarUrl ? <Image src={sorted[0].avatarUrl} alt="" width={60} height={60} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontWeight: 700, fontSize: 22, color: RANK_COLORS[0] }}>{(sorted[0].username ?? '?')[0]?.toUpperCase()}</span>}
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sorted[0].username}</p>
                <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800, color: RANK_COLORS[0], letterSpacing: '-0.02em' }}>
                  {sortBy === 'weeklyKm' ? sorted[0].weeklyKm : sorted[0].sessionCount}
                </p>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{activeTab.unit}</p>
              </div>
            </Link>

            {/* 3rd */}
            <Link href={`/profile/${sorted[2].id}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '16px 12px', textAlign: 'center', marginTop: 20 }}>
                <Crown size={16} style={{ color: RANK_COLORS[2], margin: '0 auto 8px' }} />
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-elevated)', border: `2px solid ${RANK_COLORS[2]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', overflow: 'hidden' }}>
                  {sorted[2].avatarUrl ? <Image src={sorted[2].avatarUrl} alt="" width={48} height={48} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontWeight: 700, fontSize: 18, color: RANK_COLORS[2] }}>{(sorted[2].username ?? '?')[0]?.toUpperCase()}</span>}
                </div>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sorted[2].username}</p>
                <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: RANK_COLORS[2], letterSpacing: '-0.02em' }}>
                  {sortBy === 'weeklyKm' ? sorted[2].weeklyKm : sorted[2].sessionCount}
                </p>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{activeTab.unit}</p>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Full list */}
      <div style={{ margin: '0 20px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 64 }} />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Trophy size={40} style={{ color: 'var(--border)', margin: '0 auto 12px', display: 'block' }} />
            <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>{t('leaderboard_be_first')}</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('leaderboard_complete_profile')}</p>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Zap size={11} /> {t('leaderboard_full')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {sorted.map((entry, index) => (
                <Link key={entry.id} href={`/profile/${entry.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px',
                    background: entry.isCurrentUser ? 'rgba(99,102,241,0.06)' : 'var(--bg-card)',
                    border: entry.isCurrentUser ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                    borderLeft: entry.isCurrentUser ? '3px solid #6366F1' : undefined,
                    transition: 'all 0.15s',
                  }}>
                    {/* Rank */}
                    <div style={{ width: 28, textAlign: 'center', fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em', color: getRankColor(index + 1), flexShrink: 0 }}>
                      {index + 1}
                    </div>

                    {/* Avatar */}
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-elevated)', border: index < 3 ? `1.5px solid ${getRankColor(index + 1)}` : '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                      {entry.avatarUrl
                        ? <Image src={entry.avatarUrl} alt="" width={40} height={40} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontWeight: 700, fontSize: 15, color: index < 3 ? getRankColor(index + 1) : 'var(--text-muted)' }}>{(entry.username ?? '?')[0]?.toUpperCase()}</span>
                      }
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {entry.username ?? 'Anonimowy'}
                        </span>
                        {entry.isCurrentUser && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-dim)', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0 }}>TY</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {entry.city && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{entry.city}</span>
                        )}
                        {entry.sportTypes.slice(0, 2).map(s => (
                          <span key={s} className={`sport-${s}`} style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 4 }}>
                            {getSportLabel(s).slice(0, 5)}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Stat */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: index < 3 ? getRankColor(index + 1) : 'var(--text)' }}>
                        {sortBy === 'weeklyKm' ? entry.weeklyKm : entry.sessionCount}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {activeTab.unit}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
