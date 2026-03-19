import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { unauthorized, serverError } from '@/lib/api-errors';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const result = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    return NextResponse.json(result);
  } catch (err) {
    console.error('GET /api/notifications error:', err);
    return serverError();
  }
}

export async function PATCH() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.userId, userId));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PATCH /api/notifications error:', err);
    return serverError();
  }
}
