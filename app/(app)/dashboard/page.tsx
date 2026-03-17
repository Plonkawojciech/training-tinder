'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Activity, Dumbbell, Users, TrendingUp, Plus,
  Compass, Calendar, ChevronRight, Zap, BarChart2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ActivityCard } from '@/components/feed/activity-card';
import { useLang } from '@/lib/lang';
import { StravaRecentWidget } from '@/components/strava/strava-recent-widget';

interface FeedItem {
  id: number;
  userId: string;
  type: string;
  dataJson: Record<string, unknown>;
  createdAt: string;
  creator: { username: string | null; avatarUrl: string | null; clerkId: string } | null;
  isOwn: boolean;
  isFollowing: boolean;
}

const HUBS = [
  {
    href: '/hubs/endurance',
    label: 'Wytrzymałość',
    subtitle: 'Bieganie · Kolarstwo · Pływanie',
    icon: Activity,
    gradient: 'linear-gradient(135deg, #6366F1 0%, #6D28D9 100%)',
    emoji: '🏃',
  },
  {
    href: '/hubs/strength',
    label: 'Siłownia',
    subtitle: 'Gym · Powerlifting · Rekordy',
    icon: Dumbbell,
    gradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    emoji: '🏋️',
  },
  {
    href: '/hubs/social',
    label: 'Społeczność',
    subtitle: 'Forum · Feed · Znajomi',
    icon: Users,
    gradient: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
    emoji: '🤝',
  },
  {
    href: '/hubs/analytics',
    label: 'Statystyki',
    subtitle: 'Wykresy · Rekordy · Postęp',
    icon: TrendingUp,
    gradient: 'linear-gradient(135deg, #6366F1 0%, #A78BFA 100%)',
    emoji: '📊',
  },
];

const QUICK_ACTIONS = [
  { href: '/discover', label: 'Odkryj', icon: Compass, color: '#6366F1' },
  { href: '/gym/log', label: 'Trening', icon: Dumbbell, color: '#059669' },
  { href: '/sessions/new', label: 'Sesja', icon: Calendar, color: '#D97706' },
  { href: '/forum', label: 'Forum', icon: Users, color: '#DB2777' },
];

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLang();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch('/api/feed?limit=5');
      if (res.ok) setFeed(await res.json());
    } catch (err) {
      console.error('fetchFeed error:', err);
    }
  }, []);

  useEffect(() => {
    async function checkProfile() {
      try {
        const res = await fetch('/api/users/profile');
        if (!res.ok) return;
        const data: { username?: string } | null = await res.json();
        if (!data?.username) {
          router.push('/onboarding');
          return;
        }
        setUsername(data.username);
        setHasProfile(true);
        fetchFeed();
      } catch (err) {
        console.error('checkProfile error:', err);
      }
    }
    checkProfile();
  }, [router, fetchFeed, pathname]);

  function handleFeedFollowToggle(targetId: string, following: boolean) {
    setFeed((prev) =>
      prev.map((item) =>
        item.creator?.clerkId === targetId ? { ...item, isFollowing: following } : item
      )
    );
  }

  if (hasProfile === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto md:pb-8">

      {/* ── MOBILE VIEW ─────────────────────────────── */}
      <div className="md:hidden flex flex-col" style={{ background: 'var(--bg)' }}>

        {/* Hero greeting card */}
        <div style={{ padding: '20px 16px 0' }}>
          <div style={{
            background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 60%, #A78BFA 100%)',
            borderRadius: 24,
            padding: '24px 20px',
            marginBottom: 16,
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(99,102,241,0.4)',
          }}>
            {/* Decorative circles */}
            <div style={{
              position: 'absolute', top: -20, right: -20,
              width: 100, height: 100, borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
            }} />
            <div style={{
              position: 'absolute', bottom: -30, right: 40,
              width: 60, height: 60, borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
            }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 4 }}>
                  {t('dash_ready')}
                </p>
                <h1 style={{ color: 'white', fontWeight: 800, fontSize: 22, letterSpacing: -0.5, lineHeight: 1.2 }}>
                  {username ? `Cześć, ${username}! 👋` : 'TrainMate'}
                </h1>
              </div>
              <div style={{
                width: 44, height: 44, borderRadius: 14,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Zap style={{ width: 22, height: 22, color: 'white' }} fill="white" />
              </div>
            </div>

            {/* Quick sport pills */}
            <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
              {[
                { sport: 'cycling', emoji: '🚴', label: 'Kolarstwo' },
                { sport: 'running', emoji: '🏃', label: 'Bieganie' },
                { sport: 'gym', emoji: '🏋️', label: 'Siłownia' },
              ].map((s) => (
                <Link
                  key={s.sport}
                  href={`/discover?sport=${s.sport}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 12px', borderRadius: 99,
                    background: 'rgba(255,255,255,0.15)',
                    textDecoration: 'none', color: 'white',
                    fontSize: 12, fontWeight: 600,
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  {s.emoji} {s.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Quick actions grid */}
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            <Link href="/discover" style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'var(--bg-card)', borderRadius: 20, padding: '16px',
                boxShadow: 'var(--shadow-card)',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 14,
                  background: 'rgba(99,102,241,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Compass style={{ width: 20, height: 20, color: '#6366F1' }} />
                </div>
                <div>
                  <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: 14 }}>Odkryj</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>Sportowcy</p>
                </div>
              </div>
            </Link>

            <Link href="/sessions/new" style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'var(--bg-card)', borderRadius: 20, padding: '16px',
                boxShadow: 'var(--shadow-card)',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 14,
                  background: 'rgba(5,150,105,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Plus style={{ width: 20, height: 20, color: '#059669' }} />
                </div>
                <div>
                  <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: 14 }}>Nowa Sesja</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>Zaplanuj</p>
                </div>
              </div>
            </Link>

            <Link href="/sessions" style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'var(--bg-card)', borderRadius: 20, padding: '16px',
                boxShadow: 'var(--shadow-card)',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 14,
                  background: 'rgba(217,119,6,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Calendar style={{ width: 20, height: 20, color: '#D97706' }} />
                </div>
                <div>
                  <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: 14 }}>Sesje</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>Treningi</p>
                </div>
              </div>
            </Link>

            <Link href="/gym/log" style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'var(--bg-card)', borderRadius: 20, padding: '16px',
                boxShadow: 'var(--shadow-card)',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 14,
                  background: 'rgba(219,39,119,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Dumbbell style={{ width: 20, height: 20, color: '#DB2777' }} />
                </div>
                <div>
                  <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: 14 }}>Trening</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>Zaloguj</p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* TrainPilot integration banner */}
        <div style={{ padding: '0 16px 16px' }}>
          <a
            href="https://trainpilot.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(129,140,248,0.05) 100%)',
              borderRadius: 18,
              border: '1px solid rgba(99,102,241,0.25)',
              padding: '14px 16px', textDecoration: 'none',
            }}
          >
            <div style={{
              width: 42, height: 42, borderRadius: 13, flexShrink: 0,
              background: 'linear-gradient(135deg, #6366F1, #818CF8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Zap style={{ width: 20, height: 20, color: '#fff' }} fill="#fff" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 800, fontSize: 14, color: 'var(--text)', letterSpacing: '-0.01em' }}>
                TrainPilot <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontFamily: 'Inter, sans-serif', fontSize: 12, letterSpacing: 0 }}>— analityka osobista</span>
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>FTP · CTL/ATL · Dieta · Sen · AI</p>
            </div>
            <ChevronRight style={{ width: 16, height: 16, color: '#6366F1', flexShrink: 0 }} />
          </a>
        </div>

        {/* Strava widget */}
        <div style={{ padding: '0 16px 16px' }}>
          <StravaRecentWidget />
        </div>

        {/* Recent activity */}
        {feed.length > 0 && (
          <div style={{ padding: '0 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: 16 }}>{t('dash_recent')}</p>
              <Link href="/feed" style={{ color: '#6366F1', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                Zobacz więcej
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {feed.slice(0, 3).map((item) => (
                <ActivityCard
                  key={item.id}
                  id={item.id}
                  type={item.type}
                  dataJson={item.dataJson}
                  createdAt={item.createdAt}
                  creator={item.creator}
                  isOwn={item.isOwn}
                  isFollowing={item.isFollowing}
                  onFollowToggle={handleFeedFollowToggle}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── DESKTOP VIEW ─────────────────────────────── */}
      <div className="hidden md:block p-6">

        {/* Welcome banner */}
        <div
          className="mb-8 p-6 rounded-[20px]"
          style={{
            background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 60%, #A78BFA 100%)',
            boxShadow: '0 8px 32px rgba(99,102,241,0.35)',
            position: 'relative', overflow: 'hidden',
          }}
        >
          <div style={{
            position: 'absolute', top: -30, right: -30, width: 160, height: 160,
            borderRadius: '50%', background: 'rgba(255,255,255,0.07)',
          }} />
          <div style={{
            position: 'absolute', bottom: -40, right: 100, width: 100, height: 100,
            borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
          }} />
          <div className="flex items-center justify-between relative">
            <div>
              <p className="text-white/70 text-sm mb-1">{t('dash_ready')}</p>
              <h1 className="text-white font-bold text-3xl tracking-tight">
                {t('dash_welcome')}{username ? `, ${username}` : ''}
              </h1>
              <p className="text-white/60 text-sm mt-1">{t('dash_command')}</p>
            </div>
            <div className="w-14 h-14 rounded-[18px] flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <Zap className="w-7 h-7 text-white" fill="white" />
            </div>
          </div>
        </div>

        {/* Hub cards */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-base" style={{ color: 'var(--text)' }}>{t('dash_hubs')}</h2>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {HUBS.map((hub) => {
              const Icon = hub.icon;
              return (
                <Link key={hub.href} href={hub.href} style={{ textDecoration: 'none' }}>
                  <div
                    className="p-5 rounded-[20px] transition-all hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)] group cursor-pointer h-full flex flex-col"
                    style={{ background: hub.gradient }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-[12px] flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-2xl">{hub.emoji}</span>
                    </div>
                    <h3 className="font-bold text-white text-base mb-1">{hub.label}</h3>
                    <p className="text-white/60 text-xs mb-3">{hub.subtitle}</p>
                    <div className="mt-auto flex items-center gap-1 text-white/80 text-xs font-semibold">
                      Wejdź <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Quick actions */}
        <div className="mb-8">
          <h2 className="font-bold text-base mb-4" style={{ color: 'var(--text)' }}>{t('dash_quick')}</h2>
          <div className="grid grid-cols-4 gap-3">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.href} href={action.href} style={{ textDecoration: 'none' }}>
                  <div
                    className="flex flex-col items-center gap-3 p-5 rounded-[20px] transition-all hover:scale-[1.02] hover:shadow-[var(--shadow-elevated)] group text-center"
                    style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)' }}
                  >
                    <div
                      className="w-12 h-12 rounded-[16px] flex items-center justify-center transition-all"
                      style={{ background: `${action.color}18` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: action.color }} />
                    </div>
                    <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                      {action.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* TrainPilot banner */}
        <div className="mb-8">
          <a
            href="https://trainpilot.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-5 rounded-[20px] transition-all hover:shadow-[0_8px_32px_rgba(99,102,241,0.2)]"
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(129,140,248,0.05) 100%)',
              border: '1px solid rgba(99,102,241,0.25)',
              textDecoration: 'none',
            }}
          >
            <div className="w-12 h-12 rounded-[16px] flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #6366F1, #818CF8)' }}>
              <Zap className="w-6 h-6 text-white" fill="white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base" style={{ color: 'var(--text)', fontFamily: 'Syne, Inter, sans-serif', letterSpacing: '-0.01em' }}>
                TrainPilot — analityka osobista ↗
              </p>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                FTP · CTL/ATL · Garmin · Sen · HRV · Dieta · AI Briefing
              </p>
            </div>
            <div className="text-sm font-semibold px-4 py-2 rounded-[12px]" style={{ background: 'rgba(99,102,241,0.15)', color: '#6366F1' }}>
              Otwórz
            </div>
          </a>
        </div>

        {/* Strava + Feed row */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="col-span-1">
            <StravaRecentWidget />
          </div>

          {/* Activity Feed — spans 2 cols */}
          <div className="col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-base" style={{ color: 'var(--text)' }}>{t('dash_recent')}</h2>
            <Link href="/feed" className="text-sm font-semibold flex items-center gap-1" style={{ color: '#6366F1', textDecoration: 'none' }}>
              Pełny feed <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {feed.length === 0 ? (
            <div
              className="p-10 text-center rounded-[20px]"
              style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)' }}
            >
              <BarChart2 className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-dim)' }} />
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                Brak aktywności. Obserwuj sportowców, by widzieć ich postępy!
              </p>
              <Link href="/discover">
                <Button size="sm">
                  <Compass className="w-4 h-4" />Odkryj Sportowców
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {feed.slice(0, 5).map((item) => (
                <ActivityCard
                  key={item.id}
                  id={item.id}
                  type={item.type}
                  dataJson={item.dataJson}
                  createdAt={item.createdAt}
                  creator={item.creator}
                  isOwn={item.isOwn}
                  isFollowing={item.isFollowing}
                  onFollowToggle={handleFeedFollowToggle}
                />
              ))}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
