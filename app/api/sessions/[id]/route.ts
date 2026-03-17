import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { sessions, sessionParticipants, sessionMessages, sessionReviews, activityFeed, users } from '@/lib/db/schema';
import { eq, inArray, and } from 'drizzle-orm';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

  const { id } = await params;
  const sessionId = parseInt(id);
  if (isNaN(sessionId)) return NextResponse.json({ error: 'Invalid session id' }, { status: 400 });

  try {
    const result = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const session = result[0];

    // Enforce privacy: 'friends' sessions only visible to creator/participants
    if (session.privacy === 'friends' && session.creatorId !== userId) {
      const membership = await db
        .select({ id: sessionParticipants.id })
        .from(sessionParticipants)
        .where(and(eq(sessionParticipants.sessionId, sessionId), eq(sessionParticipants.userId, userId)))
        .limit(1);
      if (membership.length === 0) {
        return NextResponse.json({ error: 'Brak dostępu' }, { status: 403 });
      }
    }

    const participants = await db
      .select({ userId: sessionParticipants.userId, joinedAt: sessionParticipants.joinedAt, status: sessionParticipants.status })
      .from(sessionParticipants)
      .where(eq(sessionParticipants.sessionId, sessionId));

    // Batch-fetch all participant users + creator in 1 query
    const allNeededIds = [...new Set([...participants.map((p) => p.userId), session.creatorId])];
    const allUserRows = allNeededIds.length > 0
      ? await db
          .select({ clerkId: users.clerkId, username: users.username, avatarUrl: users.avatarUrl })
          .from(users)
          .where(inArray(users.clerkId, allNeededIds))
      : [];
    const userMap = Object.fromEntries(allUserRows.map((u) => [u.clerkId, u]));

    const participantUsers = participants.map((p) => ({ ...p, ...(userMap[p.userId] ?? {}) }));
    const creatorUser = userMap[session.creatorId] ?? null;

    const acceptedCount = participants.filter(
      (p) => p.status === 'accepted' || p.status === 'host'
    ).length;

    return NextResponse.json({
      ...session,
      participants: participantUsers,
      participantCount: acceptedCount,
      creatorName: creatorUser?.username ?? null,
      creatorAvatar: creatorUser?.avatarUrl ?? null,
    });
  } catch (err) {
    console.error('GET /api/sessions/[id] error:', err);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

  const { id } = await params;
  const sessionId = parseInt(id);
  if (isNaN(sessionId)) return NextResponse.json({ error: 'Invalid session id' }, { status: 400 });

  try {
    const existing = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (existing[0].creatorId !== userId) {
      return NextResponse.json({ error: 'Brak dostępu' }, { status: 403 });
    }

    const body = await request.json() as Partial<{
      title: string;
      description: string;
      status: string;
      maxParticipants: number;
    }>;

    const [updated] = await db
      .update(sessions)
      .set({
        title: body.title ?? existing[0].title,
        description: body.description !== undefined ? body.description : existing[0].description,
        status: body.status ?? existing[0].status,
        maxParticipants: body.maxParticipants ?? existing[0].maxParticipants,
      })
      .where(eq(sessions.id, sessionId))
      .returning();

    return NextResponse.json(updated);
  } catch (err) {
    console.error('PUT /api/sessions/[id] error:', err);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

  const { id } = await params;
  const sessionId = parseInt(id);
  if (isNaN(sessionId)) return NextResponse.json({ error: 'Invalid session id' }, { status: 400 });

  try {
    const existing = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (existing[0].creatorId !== userId) {
      return NextResponse.json({ error: 'Brak dostępu' }, { status: 403 });
    }

    // Delete all related records before deleting the session
    await db.delete(sessionMessages).where(eq(sessionMessages.sessionId, sessionId));
    await db.delete(sessionReviews).where(eq(sessionReviews.sessionId, sessionId));
    await db.delete(sessionParticipants).where(eq(sessionParticipants.sessionId, sessionId));
    // Remove activity feed entries referencing this session
    // (dataJson may contain sessionId — clean up by checking the session creator's feed)
    await db.delete(sessions).where(eq(sessions.id, sessionId));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/sessions/[id] error:', err);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
