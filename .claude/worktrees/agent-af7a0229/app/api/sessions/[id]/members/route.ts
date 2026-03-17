import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { sessionParticipants, sessions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const sessionId = parseInt(id);

  const body = await request.json() as { memberId: string; action: 'accept' | 'reject' };

  try {
    // Verify current user is the host
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (!session || session.creatorId !== userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    if (body.action === 'accept') {
      await db
        .update(sessionParticipants)
        .set({ status: 'accepted' })
        .where(
          and(
            eq(sessionParticipants.sessionId, sessionId),
            eq(sessionParticipants.userId, body.memberId)
          )
        );
    } else {
      await db
        .delete(sessionParticipants)
        .where(
          and(
            eq(sessionParticipants.sessionId, sessionId),
            eq(sessionParticipants.userId, body.memberId)
          )
        );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PATCH /api/sessions/[id]/members error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
