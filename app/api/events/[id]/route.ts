import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { userEvents } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { unauthorized, notFound, serverError, badRequest, ErrorCode } from '@/lib/api-errors';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const eventId = parseInt(id);
  if (isNaN(eventId)) return badRequest(ErrorCode.INVALID_INPUT, 'Invalid ID');

  try {
    const body = await request.json() as {
      eventName?: string;
      eventType?: string;
      sport?: string;
      eventDate?: string;
      location?: string;
      distanceKm?: number | null;
      targetTimeSec?: number | null;
      status?: string;
      isPublic?: boolean;
    };

    const existing = await db
      .select()
      .from(userEvents)
      .where(and(eq(userEvents.id, eventId), eq(userEvents.userId, userId)))
      .limit(1);

    if (existing.length === 0) {
      return notFound('Event not found');
    }

    const [updated] = await db
      .update(userEvents)
      .set({
        eventName: body.eventName ?? existing[0].eventName,
        eventType: body.eventType ?? existing[0].eventType,
        sport: body.sport ?? existing[0].sport,
        eventDate: body.eventDate ?? existing[0].eventDate,
        location: body.location !== undefined ? body.location : existing[0].location,
        distanceKm: body.distanceKm !== undefined ? body.distanceKm : existing[0].distanceKm,
        targetTimeSec: body.targetTimeSec !== undefined ? body.targetTimeSec : existing[0].targetTimeSec,
        status: body.status ?? existing[0].status,
        isPublic: body.isPublic !== undefined ? body.isPublic : existing[0].isPublic,
      })
      .where(and(eq(userEvents.id, eventId), eq(userEvents.userId, userId)))
      .returning();

    return NextResponse.json(updated);
  } catch (err) {
    console.error(`PUT /api/events/${id} error:`, err);
    return serverError();
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const eventId = parseInt(id);
  if (isNaN(eventId)) return badRequest(ErrorCode.INVALID_INPUT, 'Invalid ID');

  try {
    const deleted = await db
      .delete(userEvents)
      .where(and(eq(userEvents.id, eventId), eq(userEvents.userId, userId)))
      .returning();

    if (deleted.length === 0) {
      return notFound('Event not found');
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(`DELETE /api/events/${id} error:`, err);
    return serverError();
  }
}
