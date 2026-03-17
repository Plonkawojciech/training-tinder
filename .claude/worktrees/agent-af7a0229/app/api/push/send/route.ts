import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { pushSubscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const VAPID_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_EMAIL
);

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!VAPID_CONFIGURED) {
    return NextResponse.json({ error: 'Push notifications not configured' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { userId: targetUserId, title, body: notifBody, url } = body;

    if (!targetUserId || !title || !notifBody) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
