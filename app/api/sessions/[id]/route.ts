import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { sessions, sessionParticipants, sessionMessages, sessionReviews, users } from '@/lib/db/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { unauthorized, forbidden, notFound, serverError, badRequest, ErrorCode } from '@/lib/api-errors';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const sessionId = parseInt(id);
  if (isNaN(sessionId)) return badRequest(ErrorCode.INVALID_INPUT, 'Invalid session id');

  try {
    const result = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (result.length === 0) {
      return notFound('Session not found');
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
        return forbidden();
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
          .select({ authEmail: users.authEmail, username: users.username, avatarUrl: users.avatarUrl })
          .from(users)
          .where(inArray(users.authEmail, allNeededIds))
      : [];
    const userMap = Object.fromEntries(allUserRows.map((u) => [u.authEmail, u]));

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
    return serverError();
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const sessionId = parseInt(id);
  if (isNaN(sessionId)) return badRequest(ErrorCode.INVALID_INPUT, 'Invalid session id');

  try {
    const existing = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (existing.length === 0) {
      return notFound('Session not found');
    }

    if (existing[0].creatorId !== userId) {
      return forbidden();
    }

    const body = await request.json() as Partial<{
      title: string;
      description: string;
      status: string;
      maxParticipants: number;
    }>;

    // Validate input fields
    const validStatuses = ['open', 'closed', 'cancelled', 'completed'];
    if (body.status !== undefined && !validStatuses.includes(body.status)) {
      return badRequest(ErrorCode.INVALID_STATUS, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }
    if (body.maxParticipants !== undefined && (body.maxParticipants <= 0 || body.maxParticipants > 200)) {
      return badRequest(ErrorCode.INVALID_INPUT, 'maxParticipants must be between 1 and 200');
    }
    if (body.title !== undefined && body.title.length > 200) {
      return badRequest(ErrorCode.INVALID_INPUT, 'Title must be 200 characters or less');
    }
    if (body.description !== undefined && body.description.length > 5000) {
      return badRequest(ErrorCode.CONTENT_TOO_LONG, 'Description must be 5000 characters or less');
    }

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
  const sessionId = parseInt(id);
  if (isNaN(sessionId)) return badRequest(ErrorCode.INVALID_INPUT, 'Invalid session id');

  try {
    const existing = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (existing.length === 0) {
      return notFound('Session not found');
    }

    if (existing[0].creatorId !== userId) {
      return forbidden();
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
    return serverError();
  }
}
