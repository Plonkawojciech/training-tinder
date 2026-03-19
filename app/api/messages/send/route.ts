import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { messages, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { isRateLimited } from '@/lib/rate-limit';
import { sanitizeText } from '@/lib/utils';
import Pusher from 'pusher';
import { unauthorized, serverError, notFound, rateLimited, badRequest, ErrorCode } from '@/lib/api-errors';

const PUSHER_ENABLED = Boolean(
  process.env.PUSHER_APP_ID && process.env.PUSHER_KEY && process.env.PUSHER_SECRET
);

const pusher = PUSHER_ENABLED
  ? new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.PUSHER_CLUSTER ?? 'eu',
      useTLS: true,
    })
  : null;

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  // Rate limit: 30 messages per user per minute
  if (isRateLimited(`msg:${userId}`, 30, 60 * 1000)) {
    return rateLimited();
  }

  try {
    const body = await request.json() as { receiverId?: unknown; content?: unknown };

    if (typeof body.receiverId !== 'string' || !body.receiverId.trim()) {
      return badRequest(ErrorCode.MISSING_FIELDS, 'receiverId is required');
    }
    if (typeof body.content !== 'string' || !body.content.trim()) {
      return badRequest(ErrorCode.MISSING_FIELDS, 'Message content is required');
    }

    const content = sanitizeText(body.content);
    const receiverId = body.receiverId.trim();

    if (content.length > 2000) {
      return badRequest(ErrorCode.CONTENT_TOO_LONG, 'Message cannot exceed 2000 characters');
    }
    if (receiverId === userId) {
      return badRequest(ErrorCode.SELF_ACTION, 'Cannot message yourself');
    }

    // Verify receiver exists
    const [receiver] = await db
      .select({ authEmail: users.authEmail })
      .from(users)
      .where(eq(users.authEmail, receiverId))
      .limit(1);

    if (!receiver) {
      return notFound('Receiver not found');
    }

    const [message] = await db
      .insert(messages)
      .values({ senderId: userId, receiverId, content })
      .returning();

    if (pusher) {
      await Promise.allSettled([
        pusher.trigger(`private-chat-${userId}`, 'new-message', message),
        pusher.trigger(`private-chat-${receiverId}`, 'new-message', message),
      ]);
    }

    try {
      const { sendPushToUser } = await import('@/lib/push');
      await sendPushToUser(receiverId, {
        title: 'Nowa wiadomość',
        body: content.slice(0, 100),
        url: '/messages',
      });
    } catch (pushErr) {
      console.warn('Push notification failed (non-blocking):', pushErr);
    }

    return NextResponse.json(message);
  } catch (err) {
    console.error('POST /api/messages/send error:', err);
    return serverError();
  }
}
