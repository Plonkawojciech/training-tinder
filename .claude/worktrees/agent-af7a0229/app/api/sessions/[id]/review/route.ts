import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { sessionReviews } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const sessionId = parseInt(id);

  const { searchParams } = new URL(request.url);
  const check = searchParams.get('check') === 'true';

  try {
    if (check) {
      const existing = await db
        .select()
        .from(sessionReviews)
        .where(
          and(
            eq(sessionReviews.sessionId, sessionId),
            eq(sessionReviews.reviewerId, userId)
          )
        )
        .limit(1);
      return NextResponse.json({ hasReviewed: existing.length > 0 });
    }

    const reviews = await db
      .select()
      .from(sessionReviews)
      .where(eq(sessionReviews.sessionId, sessionId));

    return NextResponse.json({ hasReviewed: false, reviews });
  } catch (err) {
    console.error('GET /api/sessions/[id]/review error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const sessionId = parseInt(id);

  try {
    const body = await request.json() as {
      rating: number;
      comment?: string;
    };

    if (body.rating < 1 || body.rating > 5) {
      return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 });
    }

    // Check for existing review
    const existing = await db
      .select()
      .from(sessionReviews)
      .where(
        and(
          eq(sessionReviews.sessionId, sessionId),
          eq(sessionReviews.reviewerId, userId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(sessionReviews)
        .set({ rating: body.rating, comment: body.comment ?? null })
        .where(
          and(
            eq(sessionReviews.sessionId, sessionId),
            eq(sessionReviews.reviewerId, userId)
          )
        )
        .returning();
      return NextResponse.json(updated);
    }

    const [review] = await db
      .insert(sessionReviews)
      .values({
        sessionId,
        reviewerId: userId,
        rating: body.rating,
        comment: body.comment ?? null,
      })
      .returning();

    return NextResponse.json(review);
  } catch (err) {
    console.error('POST /api/sessions/[id]/review error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
