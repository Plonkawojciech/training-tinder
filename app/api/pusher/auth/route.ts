import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID ?? '',
  key: process.env.PUSHER_KEY ?? '',
  secret: process.env.PUSHER_SECRET ?? '',
  cluster: process.env.PUSHER_CLUSTER ?? 'eu',
  useTLS: true,
});

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

    const auth = pusher.authorizeChannel(socketId, channel, {
      user_id: userId,
    });

    return NextResponse.json(auth);
  } catch (err) {
    console.error('POST /api/pusher/auth error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
