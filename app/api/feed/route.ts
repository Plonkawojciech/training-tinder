import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { friends, workoutLogs, users, feedComments, feedLikes } from '@/lib/db/schema';
import { eq, or, and, inArray, desc } from 'drizzle-orm';
import { unauthorized, serverError } from '@/lib/api-errors';

export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 50);
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0'), 0);

  try {
    // Get all accepted friends' authEmails
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

    // Get friends' recent workoutLogs
    const logs = await db
      .select()
      .from(workoutLogs)
      .where(inArray(workoutLogs.userId, friendIds))
      .orderBy(desc(workoutLogs.createdAt))
      .limit(limit)
      .offset(offset);

    if (logs.length === 0) return NextResponse.json([]);

    // Batch-fetch user info for all log authors
    const logUserIds = [...new Set(logs.map((l) => l.userId))];
    const logUsers = await db
      .select({ authEmail: users.authEmail, username: users.username, avatarUrl: users.avatarUrl })
      .from(users)
      .where(inArray(users.authEmail, logUserIds));
    const userMap = Object.fromEntries(logUsers.map((u) => [u.authEmail, u]));

    // Batch-fetch all comments for these logs
    const logIds = logs.map((l) => l.id);
    const allComments = await db
      .select()
      .from(feedComments)
      .where(inArray(feedComments.workoutLogId, logIds));

    // Batch-fetch comment authors
    const commentAuthorIds = [...new Set(allComments.map((c) => c.authorId))];
    let commentAuthors: { authEmail: string; username: string | null; avatarUrl: string | null }[] = [];
    if (commentAuthorIds.length > 0) {
      commentAuthors = await db
        .select({ authEmail: users.authEmail, username: users.username, avatarUrl: users.avatarUrl })
        .from(users)
        .where(inArray(users.authEmail, commentAuthorIds));
    }
    const authorMap = Object.fromEntries(commentAuthors.map((u) => [u.authEmail, u]));

    // Batch-fetch like counts and user's own likes
    const allLikes = logIds.length > 0
      ? await db
          .select()
          .from(feedLikes)
          .where(inArray(feedLikes.workoutLogId, logIds))
      : [];

    const likeCountMap: Record<number, number> = {};
    const likedByMeSet = new Set<number>();
    for (const like of allLikes) {
      likeCountMap[like.workoutLogId] = (likeCountMap[like.workoutLogId] ?? 0) + 1;
      if (like.userId === userId) likedByMeSet.add(like.workoutLogId);
    }

    // Assemble enriched logs
    const enriched = logs.map((log) => {
      const logComments = allComments
        .filter((c) => c.workoutLogId === log.id)
        .map((c) => ({
          ...c,
          authorName: authorMap[c.authorId]?.username ?? null,
          authorAvatar: authorMap[c.authorId]?.avatarUrl ?? null,
        }));

      return {
        ...log,
        username: userMap[log.userId]?.username ?? null,
        avatarUrl: userMap[log.userId]?.avatarUrl ?? null,
        comments: logComments,
        likeCount: likeCountMap[log.id] ?? 0,
        likedByMe: likedByMeSet.has(log.id),
      };
    });

    return NextResponse.json(enriched);
  } catch (err) {
    console.error('GET /api/feed error:', err);
    return serverError();
  }
}
