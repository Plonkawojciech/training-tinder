import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { pushSubscriptions, friends, sessionParticipants } from '@/lib/db/schema';
import { eq, and, or, inArray } from 'drizzle-orm';
import { unauthorized, forbidden, serverError, badRequest, apiError, ErrorCode } from '@/lib/api-errors';

const VAPID_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_EMAIL
);

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  if (!VAPID_CONFIGURED) {
    return apiError(ErrorCode.INTERNAL_SERVER_ERROR, 'Push notifications not configured', 503);
  }

  try {
    const body = await request.json();
    const { userId: targetUserId, title, body: notifBody, url } = body;

    if (!targetUserId || !title || !notifBody) {
      return badRequest(ErrorCode.MISSING_FIELDS, 'Missing required fields');
    }

    // Authorization: sender can push to themselves, accepted friends, or co-participants in a shared session
    if (targetUserId !== userId) {
      let authorized = false;

      // Check accepted friendship (bidirectional)
      const friendship = await db
        .select({ id: friends.id })
        .from(friends)
        .where(
          and(
            eq(friends.status, 'accepted'),
            or(
              and(eq(friends.requesterId, userId), eq(friends.receiverId, targetUserId)),
              and(eq(friends.requesterId, targetUserId), eq(friends.receiverId, userId)),
            ),
          ),
        )
        .limit(1);

      if (friendship.length > 0) {
        authorized = true;
      }

      // If not friends, check shared session participation
      if (!authorized) {
        const senderSessionRows = await db
          .select({ sessionId: sessionParticipants.sessionId })
          .from(sessionParticipants)
          .where(eq(sessionParticipants.userId, userId));

        const senderSessionIds = senderSessionRows.map(s => s.sessionId);

        if (senderSessionIds.length > 0) {
          const targetInSharedSession = await db
            .select({ id: sessionParticipants.id })
            .from(sessionParticipants)
            .where(
              and(
                eq(sessionParticipants.userId, targetUserId),
                inArray(sessionParticipants.sessionId, senderSessionIds),
              ),
            )
            .limit(1);

          if (targetInSharedSession.length > 0) {
            authorized = true;
          }
        }
      }

      if (!authorized) {
        return forbidden('Not authorized to send push to this user');
      }
    }

    const webpush = (await import('web-push')).default;
    webpush.setVapidDetails(
      `mailto:${process.env.VAPID_EMAIL}`,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );

    const subs = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, targetUserId));

    let sent = 0;
    for (const row of subs) {
      try {
        const sub = row.subscription as { endpoint: string; keys: { auth: string; p256dh: string } };
        await webpush.sendNotification(sub, JSON.stringify({ title, body: notifBody, url }));
        sent++;
      } catch (pushErr) {
        console.error('Failed to send push notification:', pushErr);
      }
    }

    return NextResponse.json({ sent });
  } catch (err) {
    console.error('POST /api/push/send error:', err);
    return serverError();
  }
}
