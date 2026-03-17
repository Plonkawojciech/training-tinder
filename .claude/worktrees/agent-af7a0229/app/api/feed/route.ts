import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { friends, workoutLogs, users, feedComments } from '@/lib/db/schema';
import { eq, or, and, inArray, desc } from 'drizzle-orm';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Get all accepted friends' clerkIds
    const friendRelations = await db
      .select()
      .from(friends)
      .where(
        and(
          or(eq(friends.requesterId, userId), eq(friends.receiverId, userId)),
          eq(friends.status, 'accepted')
        )
      );

    const friendIds = friendRelations.map((f) =>
      f.requesterId === userId ? f.receiverId : f.requesterId
    );

    if (friendIds.length === 0) return NextResponse.json([]);

    // Get friends' recent workoutLogs (last 30 days)
    const logs = await db
      .select()
      .from(workoutLogs)
      .where(inArray(workoutLogs.userId, friendIds))
      .orderBy(desc(workoutLogs.createdAt))
      .limit(50);

    // Enrich with user info and comment count
    const enriched = await Promise.all(
      logs.map(async (log) => {
        const [userRow] = await db
          .select({ username: users.username, avatarUrl: users.avatarUrl })
          .from(users)
          .where(eq(users.clerkId, log.userId))
          .limit(1);

        const comments = await db
          .select()
          .from(feedComments)
          .where(eq(feedComments.workoutLogId, log.id));

        // Enrich comments with author info
        const enrichedComments = await Promise.all(
          comments.map(async (c) => {
            const [author] = await db
              .select({ username: users.username, avatarUrl: users.avatarUrl })
              .from(users)
              .where(eq(users.clerkId, c.authorId))
              .limit(1);
            return { ...c, authorName: author?.username ?? null, authorAvatar: author?.avatarUrl ?? null };
          })
        );

        return {
          ...log,
          username: userRow?.username ?? null,
          avatarUrl: userRow?.avatarUrl ?? null,
          comments: enrichedComments,
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (err) {
    console.error('GET /api/feed error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
