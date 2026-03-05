import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { activityFeed, userFollows, users } from '@/lib/db/schema';
import { eq, or, desc, inArray } from 'drizzle-orm';

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') ?? '30');

  try {
    // Get following list
    const following = await db
      .select({ followingId: userFollows.followingId })
      .from(userFollows)
      .where(eq(userFollows.followerId, userId));

    const followingIds = following.map((f) => f.followingId);
    const allIds = [userId, ...followingIds];

    const feedItems = await db
      .select()
      .from(activityFeed)
      .where(inArray(activityFeed.userId, allIds))
      .orderBy(desc(activityFeed.createdAt))
      .limit(limit);

    const enriched = await Promise.all(
      feedItems.map(async (item) => {
        const creator = await db
          .select({ username: users.username, avatarUrl: users.avatarUrl, clerkId: users.clerkId })
          .from(users)
          .where(eq(users.clerkId, item.userId))
          .limit(1);

        const isFollowing = followingIds.includes(item.userId);

        return {
          ...item,
          creator: creator[0] ?? null,
          isFollowing,
          isOwn: item.userId === userId,
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (err) {
    console.error('GET /api/feed error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
