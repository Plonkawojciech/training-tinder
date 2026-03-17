import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { friends } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { action } = await request.json() as { action: 'accept' | 'reject' };

  try {
    const [updated] = await db.update(friends)
      .set({ status: action === 'accept' ? 'accepted' : 'rejected', updatedAt: new Date() })
      .where(and(eq(friends.id, parseInt(id)), eq(friends.receiverId, userId)))
      .returning();

    if (!updated) return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 });
    return NextResponse.json({ ok: true, friend: updated });
  } catch (err) {
    console.error('PATCH /api/friends/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  try {
    await db.delete(friends)
      .where(and(eq(friends.id, parseInt(id))));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/friends/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
