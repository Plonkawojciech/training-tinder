import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { sessionSeries } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

  const { id } = await params;
  const seriesId = parseInt(id);
  if (isNaN(seriesId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  let body: Partial<{
    dayOfWeek: number;
    time: string;
    frequency: string;
    location: string;
    minLevel: string;
    startDate: string;
    endDate: string;
    title: string;
    sport: string;
    maxParticipants: number;
    description: string;
    lat: number;
    lon: number;
    isActive: boolean;
  }>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const existing = await db
      .select()
      .from(sessionSeries)
      .where(and(eq(sessionSeries.id, seriesId), eq(sessionSeries.creatorId, userId)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Not found or access denied' }, { status: 404 });
    }

    const [updated] = await db
      .update(sessionSeries)
      .set({
        ...(body.dayOfWeek !== undefined && { dayOfWeek: body.dayOfWeek }),
        ...(body.time !== undefined && { time: body.time }),
        ...(body.frequency !== undefined && { frequency: body.frequency }),
        ...(body.location !== undefined && { location: body.location }),
        ...(body.minLevel !== undefined && { minLevel: body.minLevel }),
        ...(body.startDate !== undefined && { startDate: body.startDate }),
        ...(body.endDate !== undefined && { endDate: body.endDate }),
        ...(body.title !== undefined && { title: body.title }),
        ...(body.sport !== undefined && { sportType: body.sport }),
        ...(body.maxParticipants !== undefined && { maxParticipants: body.maxParticipants }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.lat !== undefined && { lat: body.lat }),
        ...(body.lon !== undefined && { lon: body.lon }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      })
      .where(and(eq(sessionSeries.id, seriesId), eq(sessionSeries.creatorId, userId)))
      .returning();

    return NextResponse.json(updated);
  } catch (err) {
    console.error('PUT /api/session-series/[id] error:', err);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

  const { id } = await params;
  const seriesId = parseInt(id);
  if (isNaN(seriesId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    const deleted = await db
      .delete(sessionSeries)
      .where(and(eq(sessionSeries.id, seriesId), eq(sessionSeries.creatorId, userId)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ error: 'Not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/session-series/[id] error:', err);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
