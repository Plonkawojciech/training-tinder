import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { messages, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { isRateLimited } from '@/lib/rate-limit';
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
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

  // Rate limit: 30 messages per user per minute
  if (isRateLimited(`msg:${userId}`, 30, 60 * 1000)) {
    return NextResponse.json({ error: 'Wysyłasz za szybko. Poczekaj chwilę.' }, { status: 429 });
  }

  try {
    const body = await request.json() as { receiverId?: unknown; content?: unknown };

    if (typeof body.receiverId !== 'string' || !body.receiverId.trim()) {
      return NextResponse.json({ error: 'receiverId jest wymagany' }, { status: 400 });
    }
    if (typeof body.content !== 'string' || !body.content.trim()) {
      return NextResponse.json({ error: 'Treść wiadomości jest wymagana' }, { status: 400 });
    }

    const content = body.content.trim();
    const receiverId = body.receiverId.trim();

    if (content.length > 2000) {
      return NextResponse.json({ error: 'Wiadomość może mieć max. 2000 znaków' }, { status: 400 });
    }
    if (receiverId === userId) {
      return NextResponse.json({ error: 'Nie możesz napisać do siebie' }, { status: 400 });
    }

    // Verify receiver exists
    const [receiver] = await db
      .select({ clerkId: users.clerkId })
      .from(users)
      .where(eq(users.clerkId, receiverId))
      .limit(1);

    if (!receiver) {
      return NextResponse.json({ error: 'Odbiorca nie istnieje' }, { status: 404 });
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
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
