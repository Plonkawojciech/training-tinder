import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { swipes, matches } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { unauthorized, serverError, badRequest, ErrorCode } from '@/lib/api-errors';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const userSwipes = await db
      .select({ targetId: swipes.targetId })
      .from(swipes)
      .where(eq(swipes.swiperId, userId));

    const swipedIds = userSwipes.map((s) => s.targetId);
    return NextResponse.json({ swipedIds });
  } catch (err) {
    console.error('GET /api/swipes error:', err);
    return serverError();
  }
}

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const body = await request.json() as { targetId: string; direction: 'like' | 'pass' };
    const { targetId, direction } = body;

    if (!targetId || !direction || !['like', 'pass'].includes(direction)) {
      return badRequest(ErrorCode.INVALID_INPUT, 'Invalid body');
    }

    // Upsert swipe (ignore if already swiped)
    await db
      .insert(swipes)
      .values({ swiperId: userId, targetId, direction })
      .onConflictDoNothing();

    // Check for mutual like
    if (direction === 'like') {
      const theyLikedMe = await db
        .select()
        .from(swipes)
        .where(
          and(
            eq(swipes.swiperId, targetId),
            eq(swipes.targetId, userId),
            eq(swipes.direction, 'like')
          )
        )
        .limit(1);

      if (theyLikedMe.length > 0) {
        // Mutual like — create match if not already exists
        const existingMatch = await db
          .select()
          .from(matches)
          .where(
            and(eq(matches.user1Id, userId), eq(matches.user2Id, targetId))
          )
          .limit(1);

        const existingMatchReverse = await db
          .select()
          .from(matches)
          .where(
            and(eq(matches.user1Id, targetId), eq(matches.user2Id, userId))
          )
          .limit(1);

        if (existingMatch.length === 0 && existingMatchReverse.length === 0) {
          await db.insert(matches).values({
            user1Id: userId,
            user2Id: targetId,
            score: 85,
          });
        }

        return NextResponse.json({ match: true });
      }
    }

    return NextResponse.json({ match: false });
  } catch (err) {
    console.error('POST /api/swipes error:', err);
    return serverError();
  }
}
