import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { sessionMessages, sessionParticipants, users } from '@/lib/db/schema';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { isRateLimited } from '@/lib/rate-limit';
import { sanitizeText } from '@/lib/utils';
import { unauthorized, forbidden, serverError, badRequest, rateLimited, ErrorCode } from '@/lib/api-errors';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const sessionId = parseInt(id);
  if (isNaN(sessionId)) return badRequest(ErrorCode.INVALID_INPUT, 'Invalid session id');

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50') || 50, 100);
  const offset = parseInt(url.searchParams.get('offset') ?? '0') || 0;

  try {
    // Verify the user is a participant of this session before returning any messages
    const participation = await db
      .select({ id: sessionParticipants.id })
      .from(sessionParticipants)
      .where(and(eq(sessionParticipants.sessionId, sessionId), eq(sessionParticipants.userId, userId)))
      .limit(1);

    if (participation.length === 0) {
      return forbidden();
    }

    // Fetch with pagination — get newest first, then reverse for chronological display
    const msgs = await db
      .select()
      .from(sessionMessages)
      .where(eq(sessionMessages.sessionId, sessionId))
      .orderBy(desc(sessionMessages.createdAt))
      .limit(limit)
      .offset(offset)
      .then(rows => rows.reverse());

    if (msgs.length === 0) return NextResponse.json([]);

    // Batch-fetch all senders in one query
    const senderIds = [...new Set(msgs.map((m) => m.senderId))];
    const senderRows = await db
      .select({ authEmail: users.authEmail, username: users.username, avatarUrl: users.avatarUrl })
      .from(users)
      .where(inArray(users.authEmail, senderIds));
    const senderMap = Object.fromEntries(senderRows.map((u) => [u.authEmail, u]));

    const enriched = msgs.map((msg) => ({
      ...msg,
      username: senderMap[msg.senderId]?.username ?? null,
      avatarUrl: senderMap[msg.senderId]?.avatarUrl ?? null,
    }));

    return NextResponse.json(enriched);
  } catch (err) {
    console.error('GET /api/sessions/[id]/messages error:', err);
    return serverError();
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  // Rate limit: 30 messages per minute per user
  if (isRateLimited(`sess-msg:${userId}`, 30, 60_000)) {
    return rateLimited();
  }

  const { id } = await params;
  const sessionId = parseInt(id);
  if (isNaN(sessionId)) return badRequest(ErrorCode.INVALID_INPUT, 'Invalid session id');

  try {
    // Check if user is participant
    const participation = await db
      .select()
      .from(sessionParticipants)
      .where(
        and(
          eq(sessionParticipants.sessionId, sessionId),
          eq(sessionParticipants.userId, userId)
        )
      )
      .limit(1);

    if (participation.length === 0) {
      return forbidden('Not a participant of this session');
    }

    const body = await request.json() as { content: string };

    if (!body.content || body.content.trim().length === 0) {
      return badRequest(ErrorCode.MISSING_FIELDS, 'Content is required');
    }

    if (body.content.length > 2000) {
      return badRequest(ErrorCode.CONTENT_TOO_LONG, 'Message must be 2000 characters or less');
    }

    const [message] = await db
      .insert(sessionMessages)
      .values({
        sessionId,
        senderId: userId,
        content: sanitizeText(body.content),
      })
      .returning();

    // Get sender user info
    const senderUser = await db
      .select({ username: users.username, avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.authEmail, userId))
      .limit(1);

    const enrichedMessage = {
      ...message,
      username: senderUser[0]?.username ?? null,
      avatarUrl: senderUser[0]?.avatarUrl ?? null,
    };

    // Trigger Pusher event if configured
    const pusherAppId = process.env.PUSHER_APP_ID;
    const pusherKey = process.env.PUSHER_KEY;
    const pusherSecret = process.env.PUSHER_SECRET;

    if (pusherAppId && pusherKey && pusherSecret) {
      try {
        const Pusher = (await import('pusher')).default;
        const pusher = new Pusher({
          appId: pusherAppId,
          key: pusherKey,
          secret: pusherSecret,
          cluster: process.env.PUSHER_CLUSTER ?? 'eu',
          useTLS: true,
        });
        await pusher.trigger(`private-session-${sessionId}`, 'new-message', enrichedMessage);
      } catch (pusherErr) {
        console.error('Pusher trigger failed (non-fatal):', pusherErr);
      }
    }

    return NextResponse.json(enrichedMessage);
  } catch (err) {
    console.error('POST /api/sessions/[id]/messages error:', err);
    return serverError();
  }
}
