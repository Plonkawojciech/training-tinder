import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { feedComments, friends, workoutLogs } from '@/lib/db/schema';
import { eq, or, and } from 'drizzle-orm';
import { unauthorized, forbidden, notFound, serverError, badRequest, ErrorCode } from '@/lib/api-errors';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const workoutLogId = parseInt(id);
  if (isNaN(workoutLogId)) return badRequest(ErrorCode.INVALID_INPUT, 'Invalid workout log id');

  try {
    // Verify the workout belongs to a friend OR the user themselves
    const [log] = await db
      .select()
      .from(workoutLogs)
      .where(eq(workoutLogs.id, workoutLogId))
      .limit(1);

    if (!log) return notFound();

    if (log.userId !== userId) {
      const friendship = await db
        .select()
        .from(friends)
        .where(
          and(
            or(
              and(eq(friends.requesterId, userId), eq(friends.receiverId, log.userId)),
              and(eq(friends.requesterId, log.userId), eq(friends.receiverId, userId))
            ),
            eq(friends.status, 'accepted')
          )
        )
        .limit(1);

      if (friendship.length === 0) {
        return forbidden();
      }
    }

    const body = await request.json() as { content: string };
    if (!body.content?.trim()) {
      return badRequest(ErrorCode.MISSING_FIELDS, 'Content required');
    }

    const [comment] = await db
      .insert(feedComments)
      .values({ workoutLogId, authorId: userId, content: body.content.trim() })
      .returning();

    return NextResponse.json(comment);
  } catch (err) {
    console.error('POST /api/feed/[id]/comments error:', err);
    return serverError();
  }
}
