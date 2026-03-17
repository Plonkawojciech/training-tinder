import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { sessions, sessionParticipants } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

  const { id } = await params;
  const sessionId = parseInt(id);
  if (isNaN(sessionId)) return NextResponse.json({ error: 'Invalid session id' }, { status: 400 });

  try {
    const sessionRows = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (sessionRows.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const session = sessionRows[0];

    if (session.status === 'cancelled') {
      return NextResponse.json({ error: 'Session is cancelled' }, { status: 400 });
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
      return NextResponse.json({ error: 'Already joined' }, { status: 400 });
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
      return NextResponse.json({ error: 'Session is full' }, { status: 400 });
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
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
