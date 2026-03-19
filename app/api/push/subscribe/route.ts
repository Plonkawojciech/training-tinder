import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { pushSubscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { unauthorized, serverError, badRequest, ErrorCode } from '@/lib/api-errors';

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const body = await request.json();
    const { subscription } = body;

    if (!subscription || !subscription.endpoint) {
      return badRequest(ErrorCode.INVALID_INPUT, 'Invalid subscription object');
    }

    // Check if user already has a subscription
    const existing = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      // Update existing
      await db
        .update(pushSubscriptions)
        .set({ subscription })
        .where(eq(pushSubscriptions.userId, userId));
    } else {
      // Insert new
      await db.insert(pushSubscriptions).values({ userId, subscription });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('POST /api/push/subscribe error:', err);
    return serverError();
  }
}
