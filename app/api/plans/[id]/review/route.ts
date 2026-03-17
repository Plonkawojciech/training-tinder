import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { planReviews } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

  const { id } = await params;
  const planId = parseInt(id);
  if (isNaN(planId)) return NextResponse.json({ error: 'Invalid plan id' }, { status: 400 });

  try {
    const reviews = await db
      .select()
      .from(planReviews)
      .where(eq(planReviews.planId, planId));

    return NextResponse.json({ reviews });
  } catch (err) {
    console.error('GET /api/plans/[id]/review error:', err);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

  const { id } = await params;
  const planId = parseInt(id);
  if (isNaN(planId)) return NextResponse.json({ error: 'Invalid plan id' }, { status: 400 });

  try {
    const body = await request.json() as { rating: number; comment?: string };

    if (body.rating < 1 || body.rating > 5) {
      return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 });
    }

    const existing = await db
      .select()
      .from(planReviews)
      .where(and(eq(planReviews.planId, planId), eq(planReviews.reviewerId, userId)))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(planReviews)
        .set({ rating: body.rating, comment: body.comment ?? null })
        .where(and(eq(planReviews.planId, planId), eq(planReviews.reviewerId, userId)))
        .returning();
      return NextResponse.json(updated);
    }

    const [review] = await db
      .insert(planReviews)
      .values({ planId, reviewerId: userId, rating: body.rating, comment: body.comment ?? null })
      .returning();

    return NextResponse.json(review);
  } catch (err) {
    console.error('POST /api/plans/[id]/review error:', err);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
