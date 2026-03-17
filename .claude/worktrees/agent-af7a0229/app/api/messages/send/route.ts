import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { messages } from '@/lib/db/schema';
import Pusher from 'pusher';

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
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { receiverId, content } = await request.json() as {
      receiverId: string;
      content: string;
    };

    if (!receiverId || !content?.trim()) {
      return NextResponse.json({ error: 'receiverId and content required' }, { status: 400 });
    }

    const [message] = await db
      .insert(messages)
      .values({
        senderId: userId,
        receiverId,
        content: content.trim(),
      })
      .returning();

    // Trigger Pusher event on sender and receiver channels
    if (pusher) {
      await Promise.allSettled([
        pusher.trigger(`private-chat-${userId}`, 'new-message', message),
        pusher.trigger(`private-chat-${receiverId}`, 'new-message', message),
      ]);
    }

    // Send push notification to receiver (non-blocking)
    try {
      const { sendPushToUser } = await import('@/lib/push');
      await sendPushToUser(receiverId, {
        title: 'Nowa wiadomość',
        body: content.slice(0, 100),
        url: '/messages',
      });
    } catch {} // non-blocking

    return NextResponse.json(message);
  } catch (err) {
    console.error('POST /api/messages/send error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
