import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
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

  if (!pusher) {
    return NextResponse.json({ error: 'Pusher not configured' }, { status: 503 });
  }

  try {
    const formData = await request.formData();
    const socketId = formData.get('socket_id') as string;
    const channel = formData.get('channel_name') as string;

    if (!socketId || !channel) {
      return NextResponse.json({ error: 'Missing socket_id or channel_name' }, { status: 400 });
    }

    // Only allow users to auth into their own channels
    const allowedChannels = [
      `private-chat-${userId}`,
      `user-${userId}`,
    ];

    if (!allowedChannels.includes(channel)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const authData = pusher.authorizeChannel(socketId, channel, {
      user_id: userId,
    });

    return NextResponse.json(authData);
  } catch (err) {
    console.error('POST /api/pusher/auth error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
