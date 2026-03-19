import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { messages } from '@/lib/db/schema';
import { and, eq, count } from 'drizzle-orm';
import { unauthorized, serverError } from '@/lib/api-errors';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const [result] = await db
      .select({ count: count() })
      .from(messages)
      .where(
        and(
          eq(messages.receiverId, userId),
          eq(messages.read, false)
        )
      );

    return NextResponse.json({ unreadCount: result?.count ?? 0 });
  } catch (err) {
    console.error('GET /api/messages/unread-count error:', err);
    return serverError();
  }
}
