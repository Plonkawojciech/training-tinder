import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { sessionSeries, activityFeed } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/session-series/[id]/join  — join a recurring series
 * DELETE /api/session-series/[id]/join — leave a recurring series
 *
 * Membership is tracked via activityFeed entries with type='series_join'.
 */

export async function POST(_request: Request, { params }: RouteParams) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const seriesId = parseInt(id);
  if (isNaN(seriesId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    // Verify series exists and is active
    const series = await db
      .select()
      .from(sessionSeries)
      .where(and(eq(sessionSeries.id, seriesId), eq(sessionSeries.isActive, true)))
      .limit(1);

    if (series.length === 0) {
      return NextResponse.json({ error: 'Series not found or inactive' }, { status: 404 });
    }

    // Record join in activity feed
    await db.insert(activityFeed).values({
      userId,
      type: 'series_join',
      dataJson: { seriesId, joinedAt: new Date().toISOString() },
    });

    return NextResponse.json({ success: true, joined: true, seriesId });
  } catch (err) {
    console.error('POST /api/session-series/[id]/join error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const seriesId = parseInt(id);
  if (isNaN(seriesId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    // Record leave in activity feed
    await db.insert(activityFeed).values({
      userId,
      type: 'series_leave',
      dataJson: { seriesId, leftAt: new Date().toISOString() },
    });

    return NextResponse.json({ success: true, joined: false, seriesId });
  } catch (err) {
    console.error('DELETE /api/session-series/[id]/join error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
