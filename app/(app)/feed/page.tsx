'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Zap } from 'lucide-react';
import { ActivityCard } from '@/components/feed/activity-card';
import { Button } from '@/components/ui/button';

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

export default function FeedPage() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/feed?limit=50');
      if (res.ok) setFeed(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  function handleFollowToggle(targetId: string, following: boolean) {
    setFeed((prev) =>
      prev.map((item) =>
        item.creator?.clerkId === targetId
          ? { ...item, isFollowing: following }
          : item
      )
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-white tracking-wider">ACTIVITY FEED</h1>
          <p className="text-[#888888] text-sm mt-1">
            Latest from you and people you follow
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={loadFeed} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 skeleton" />
          ))}
        </div>
      ) : feed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Zap className="w-12 h-12 text-[#2A2A2A]" />
          <h3 className="font-display text-xl text-[#888888]">FEED IS EMPTY</h3>
          <p className="text-[#888888] text-sm text-center max-w-sm">
            Log a workout or follow other athletes to see their activity here.
          </p>
          <div className="flex gap-3">
            <a href="/gym/log" className="px-4 py-2 bg-[#FF4500] text-white text-sm font-semibold uppercase tracking-wider hover:shadow-[0_0_20px_rgba(255,69,0,0.4)] transition-all">
              Log Workout
            </a>
            <a href="/discover" className="px-4 py-2 border border-[#2A2A2A] text-[#888888] text-sm font-semibold uppercase tracking-wider hover:border-[#FF4500] hover:text-white transition-all">
              Find Athletes
            </a>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {feed.map((item) => (
            <ActivityCard
              key={item.id}
              id={item.id}
              type={item.type}
              dataJson={item.dataJson}
              createdAt={item.createdAt}
              creator={item.creator}
              isOwn={item.isOwn}
              isFollowing={item.isFollowing}
              onFollowToggle={handleFollowToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
