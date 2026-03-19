'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, MessageSquare, Rss, ChevronRight, Heart, Calendar, Trophy } from 'lucide-react';
import { useLang } from '@/lib/lang';

interface ForumPost {
  id: number;
  title: string;
  category: string;
  replyCount: number;
  createdAt: string;
  author: { username: string | null } | null;
}

interface FeedItem {
  id: number;
  type: string;
  dataJson: Record<string, unknown>;
  createdAt: string;
  creator: { username: string | null; avatarUrl: string | null } | null;
  isOwn: boolean;
  isFollowing: boolean;
}

export default function SocialHubPage() {
  const { t, lang } = useLang();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const FEED_TYPE_LABELS: Record<string, string> = {
    workout_log: t('hub_soc_feed_workout_log'),
    session_join: t('hub_soc_feed_session_join'),
    strava_activity: t('hub_soc_feed_strava'),
    pr: t('hub_soc_feed_pr'),
  };

  const dateLocale = lang === 'pl' ? 'pl-PL' : 'en-US';

  useEffect(() => {
    async function load() {
      try {
        const [postsRes, feedRes] = await Promise.all([
          fetch('/api/forum/posts?limit=5'),
          fetch('/api/feed?limit=5'),
        ]);
        if (postsRes.ok) setPosts(await postsRes.json());
        if (feedRes.ok) setFeed(await feedRes.json());
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto md:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-[rgba(99,102,241,0.1)] border border-[rgba(99,102,241,0.2)] flex items-center justify-center">
          <Users className="w-5 h-5 text-[#6366F1]" />
        </div>
        <div>
          <h1 className="font-display text-3xl text-white tracking-wider">{t('hub_social_title')}</h1>
          <p className="text-[#888888] text-sm">{t('hub_social_subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Forum Posts */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-sm text-[#888888] tracking-wider">{t('hub_soc_recent_posts')}</h2>
            <Link href="/forum" className="text-xs text-[#6366F1] hover:text-[#818CF8] flex items-center gap-1 transition-colors">
              {t('hub_soc_all')} <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 skeleton" />)}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-10 h-10 text-[#2A2A2A] mx-auto mb-3" />
              <p className="text-[#888888] text-sm mb-3">{t('hub_soc_no_posts')}</p>
              <Link
                href="/forum"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#6366F1] text-white text-xs font-semibold uppercase tracking-wider hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all"
              >
                {t('hub_soc_go_forum')}
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {posts.map((post) => (
                <Link key={post.id} href={`/forum/${post.id}`}>
                  <div className="p-3 bg-[var(--bg-card)] border border-[var(--border)] hover:border-[#6366F1] transition-colors">
                    <p className="text-sm text-white font-medium truncate">{post.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-[#555555]">
                      <span className="text-[#6366F1]">{post.category}</span>
                      <span>{post.author?.username ?? t('hub_soc_anonymous')}</span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {post.replyCount}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-sm text-[#888888] tracking-wider">{t('hub_soc_activity')}</h2>
            <Link href="/feed" className="text-xs text-[#6366F1] hover:text-[#818CF8] flex items-center gap-1 transition-colors">
              {t('hub_soc_full_feed')} <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 skeleton" />)}
            </div>
          ) : feed.length === 0 ? (
            <div className="text-center py-8">
              <Rss className="w-10 h-10 text-[#2A2A2A] mx-auto mb-3" />
              <p className="text-[#888888] text-sm">{t('hub_soc_no_activity')}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {feed.map((item) => (
                <div key={item.id} className="flex items-start gap-3 p-3 bg-[var(--bg-card)] border border-[var(--border)]">
                  <div className="w-7 h-7 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-[#888888]">
                    {(item.creator?.username?.[0] ?? '?').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white">
                      <span className="font-medium">{item.creator?.username ?? t('hub_soc_someone')}</span>
                      {' '}
                      <span className="text-[#555555]">{FEED_TYPE_LABELS[item.type] ?? item.type}</span>
                    </p>
                    <p className="text-[10px] text-[#444444] mt-0.5">
                      {new Date(item.createdAt).toLocaleDateString(dateLocale)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] p-5 mt-6">
        <h2 className="font-display text-sm text-[#888888] tracking-wider mb-4">{t('hub_soc_quick_actions')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: '/forum', label: t('hub_soc_forum'), icon: Users },
            { href: '/messages', label: t('hub_soc_messages'), icon: MessageSquare },
            { href: '/discover', label: t('hub_soc_discover'), icon: Heart },
            { href: '/leaderboard', label: t('hub_soc_ranking'), icon: Trophy },
          ].map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 p-3 border border-[var(--border)] hover:border-[#6366F1] hover:bg-[rgba(99,102,241,0.05)] transition-all group"
              >
                <Icon className="w-4 h-4 text-[#888888] group-hover:text-[#6366F1] transition-colors" />
                <span className="text-sm text-[#888888] group-hover:text-white transition-colors">{link.label}</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#444444] group-hover:text-[#6366F1] ml-auto transition-colors" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Upcoming sessions */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] p-5 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-sm text-[#888888] tracking-wider">{t('hub_soc_upcoming_sessions')}</h2>
          <Link href="/sessions" className="text-xs text-[#6366F1] hover:text-[#818CF8] flex items-center gap-1 transition-colors">
            {t('hub_soc_all')} <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="flex items-center gap-3 p-4 bg-[var(--bg-card)] border border-[var(--border)]">
          <Calendar className="w-8 h-8 text-[#2A2A2A]" />
          <div>
            <p className="text-sm text-[#888888]">{t('hub_soc_browse_sessions')}</p>
            <Link href="/sessions" className="text-xs text-[#6366F1] hover:underline">{t('hub_soc_see_sessions')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
