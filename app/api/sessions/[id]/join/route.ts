import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { sessions, sessionParticipants } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { unauthorized, notFound, serverError, badRequest, ErrorCode } from '@/lib/api-errors';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const sessionId = parseInt(id);
  if (isNaN(sessionId)) return badRequest(ErrorCode.INVALID_INPUT, 'Invalid session id');

  try {
    const sessionRows = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (sessionRows.length === 0) {
      return notFound('Session not found');
    }

    const session = sessionRows[0];

    if (session.status === 'cancelled') {
      return badRequest(ErrorCode.INVALID_STATUS, 'Session is cancelled');
    }

    const existing = await db
      .select()
      .from(sessionParticipants)
      .where(
        and(
          eq(sessionParticipants.sessionId, sessionId),
          eq(sessionParticipants.userId, userId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return badRequest(ErrorCode.ALREADY_JOINED, 'Already joined');
    }

    // Use DB-level count to avoid race condition
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(sessionParticipants)
      .where(
        and(
          eq(sessionParticipants.sessionId, sessionId),
          sql`${sessionParticipants.status} IN ('accepted', 'host')`
        )
      );
    const acceptedCount = Number(countResult[0]?.count ?? 0);

    if (acceptedCount >= session.maxParticipants) {
      return badRequest(ErrorCode.SESSION_FULL, 'Session is full');
    }

    const isHost = session.creatorId === userId;
    const status = isHost ? 'host' : 'pending';

    await db.insert(sessionParticipants).values({ sessionId, userId, status });

    if (isHost) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ pending: true });
  } catch (err) {
    console.error('POST /api/sessions/[id]/join error:', err);
    return serverError();
  }
}
