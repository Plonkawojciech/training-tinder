import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { feedLikes, workoutLogs } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { unauthorized, notFound, serverError, badRequest, ErrorCode } from '@/lib/api-errors';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const workoutLogId = parseInt(id);
  if (isNaN(workoutLogId)) return badRequest(ErrorCode.INVALID_INPUT, 'Invalid id');

  try {
    // Verify workout log exists
    const [log] = await db
      .select()
      .from(workoutLogs)
      .where(eq(workoutLogs.id, workoutLogId))
      .limit(1);

    if (!log) return notFound();

    // Check if already liked
    const [existing] = await db
      .select()
      .from(feedLikes)
      .where(
        and(
          eq(feedLikes.workoutLogId, workoutLogId),
          eq(feedLikes.userId, userId)
        )
      )
      .limit(1);

    if (existing) {
      // Unlike
      await db
        .delete(feedLikes)
        .where(
          and(
            eq(feedLikes.workoutLogId, workoutLogId),
            eq(feedLikes.userId, userId)
          )
        );
      return NextResponse.json({ liked: false });
    } else {
      // Like
      await db
        .insert(feedLikes)
        .values({ workoutLogId, userId });
      return NextResponse.json({ liked: true });
    }
  } catch (err) {
    console.error('POST /api/feed/[id]/like error:', err);
    return serverError();
  }
}
