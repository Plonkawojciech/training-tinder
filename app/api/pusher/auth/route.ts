import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { sessionParticipants } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import Pusher from 'pusher';
import { unauthorized, forbidden, serverError, badRequest, apiError, ErrorCode } from '@/lib/api-errors';

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

  if (!pusher) {
    return apiError(ErrorCode.INTERNAL_SERVER_ERROR, 'Pusher not configured', 503);
  }

  try {
    const formData = await request.formData();
    const socketId = formData.get('socket_id') as string;
    const channel = formData.get('channel_name') as string;

    if (!socketId || !channel) {
      return badRequest(ErrorCode.MISSING_FIELDS, 'Missing socket_id or channel_name');
    }

    // Allow user-specific channels
    const allowedChannels = [
      `private-chat-${userId}`,
      `user-${userId}`,
    ];

    let isAllowed = allowedChannels.includes(channel);

    // Allow session-{id} channels if the user is a participant
    if (!isAllowed) {
      const sessionMatch = channel.match(/^(?:private-)?session-(\d+)$/);
      if (sessionMatch) {
        const sessionId = parseInt(sessionMatch[1], 10);
        const [membership] = await db
          .select({ id: sessionParticipants.id })
          .from(sessionParticipants)
          .where(
            and(
              eq(sessionParticipants.sessionId, sessionId),
              eq(sessionParticipants.userId, userId)
            )
          )
          .limit(1);
        if (membership) {
          isAllowed = true;
        }
      }
    }

    if (!isAllowed) {
      return forbidden();
    }

    const authData = pusher.authorizeChannel(socketId, channel, {
      user_id: userId,
    });

    return NextResponse.json(authData);
  } catch (err) {
    console.error('POST /api/pusher/auth error:', err);
    return serverError();
  }
}
