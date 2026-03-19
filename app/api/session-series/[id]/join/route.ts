import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { sessionSeries, activityFeed } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { unauthorized, serverError, badRequest, notFound, ErrorCode } from '@/lib/api-errors';

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
  if (!userId) return unauthorized();

  const { id } = await params;
  const seriesId = parseInt(id);
  if (isNaN(seriesId)) return badRequest(ErrorCode.INVALID_INPUT, 'Invalid id');

  try {
    // Verify series exists and is active
    const series = await db
      .select()
      .from(sessionSeries)
      .where(and(eq(sessionSeries.id, seriesId), eq(sessionSeries.isActive, true)))
      .limit(1);

    if (series.length === 0) {
      return notFound('Series not found or inactive');
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
    return serverError();
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const seriesId = parseInt(id);
  if (isNaN(seriesId)) return badRequest(ErrorCode.INVALID_INPUT, 'Invalid id');

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
    return serverError();
  }
}
