import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { messages } from '@/lib/db/schema';
import { and, eq, or, asc } from 'drizzle-orm';

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const partnerId = searchParams.get('partnerId');

  if (!partnerId) {
    return NextResponse.json({ error: 'partnerId required' }, { status: 400 });
  }

  try {
    const result = await db
      .select()
      .from(messages)
      .where(
        or(
          and(eq(messages.senderId, userId), eq(messages.receiverId, partnerId)),
          and(eq(messages.senderId, partnerId), eq(messages.receiverId, userId))
        )
      )
      .orderBy(asc(messages.createdAt));

    return NextResponse.json(result);
  } catch (err) {
    console.error('GET /api/messages error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
