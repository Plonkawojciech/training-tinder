import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { sessions, sessionParticipants } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const sessionId = parseInt(id);

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

    const participants = await db
      .select()
      .from(sessionParticipants)
      .where(eq(sessionParticipants.sessionId, sessionId));

    if (participants.length >= session.maxParticipants) {
      return NextResponse.json({ error: 'Session is full' }, { status: 400 });
    }

    await db.insert(sessionParticipants).values({ sessionId, userId });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('POST /api/sessions/[id]/join error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
