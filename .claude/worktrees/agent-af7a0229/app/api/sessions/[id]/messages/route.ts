import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { sessionMessages, sessionParticipants, users } from '@/lib/db/schema';
import { eq, asc, and } from 'drizzle-orm';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const sessionId = parseInt(id);

  try {
    const msgs = await db
      .select()
      .from(sessionMessages)
      .where(eq(sessionMessages.sessionId, sessionId))
      .orderBy(asc(sessionMessages.createdAt));

    // Enrich each message with user info
    const enriched = await Promise.all(
      msgs.map(async (msg) => {
        const user = await db
          .select({ username: users.username, avatarUrl: users.avatarUrl })
          .from(users)
          .where(eq(users.clerkId, msg.senderId))
          .limit(1);
        return {
          ...msg,
          username: user[0]?.username ?? null,
          avatarUrl: user[0]?.avatarUrl ?? null,
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (err) {
    console.error('GET /api/sessions/[id]/messages error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const sessionId = parseInt(id);

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
      return NextResponse.json({ error: 'Not a participant of this session' }, { status: 403 });
    }

    const body = await request.json() as { content: string };

    if (!body.content || body.content.trim().length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const [message] = await db
      .insert(sessionMessages)
      .values({
        sessionId,
        senderId: userId,
        content: body.content.trim(),
      })
      .returning();

    // Get sender user info
    const senderUser = await db
      .select({ username: users.username, avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.clerkId, userId))
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
        await pusher.trigger(`session-${sessionId}`, 'new-message', enrichedMessage);
      } catch (pusherErr) {
        console.error('Pusher trigger failed (non-fatal):', pusherErr);
      }
    }

    return NextResponse.json(enrichedMessage);
  } catch (err) {
    console.error('POST /api/sessions/[id]/messages error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
