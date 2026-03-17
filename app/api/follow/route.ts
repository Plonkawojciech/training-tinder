import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { userFollows } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

  try {
    const body = await request.json() as { targetId: string };
    const { targetId } = body;

    if (targetId === userId) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
    }

    // Check if already following
    const existing = await db
      .select()
      .from(userFollows)
      .where(
        and(
          eq(userFollows.followerId, userId),
          eq(userFollows.followingId, targetId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Unfollow
      await db
        .delete(userFollows)
        .where(
          and(
            eq(userFollows.followerId, userId),
            eq(userFollows.followingId, targetId)
          )
        );
      return NextResponse.json({ following: false });
    } else {
      // Follow
      await db.insert(userFollows).values({
        followerId: userId,
        followingId: targetId,
      });
      return NextResponse.json({ following: true });
    }
  } catch (err) {
    console.error('POST /api/follow error:', err);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
