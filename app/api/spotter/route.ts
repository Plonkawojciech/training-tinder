import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { spotterRequests, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json() as {
    exercise: string;
    weightKg?: number;
    gymName: string;
    gymPlaceId?: string;
    message?: string;
  };

  if (!body.exercise || !body.gymName) {
    return NextResponse.json({ error: 'exercise and gymName are required' }, { status: 400 });
  }

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

  const [req] = await db
    .insert(spotterRequests)
    .values({
      requesterId: userId,
      exercise: body.exercise,
      weightKg: body.weightKg ?? null,
      gymName: body.gymName,
      gymPlaceId: body.gymPlaceId ?? null,
      message: body.message ?? null,
      status: 'open',
      expiresAt,
    })
    .returning();

  return NextResponse.json(req);
}

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const gymPlaceId = searchParams.get('gymPlaceId');
  const gymName = searchParams.get('gymName');

  const now = new Date();

  let results;
  if (gymPlaceId) {
    results = await db
      .select({
        request: spotterRequests,
        requester: {
          clerkId: users.clerkId,
          username: users.username,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(spotterRequests)
      .leftJoin(users, eq(spotterRequests.requesterId, users.clerkId))
      .where(and(eq(spotterRequests.gymPlaceId, gymPlaceId), eq(spotterRequests.status, 'open')));
  } else if (gymName) {
    results = await db
      .select({
        request: spotterRequests,
        requester: {
          clerkId: users.clerkId,
          username: users.username,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(spotterRequests)
      .leftJoin(users, eq(spotterRequests.requesterId, users.clerkId))
      .where(and(eq(spotterRequests.gymName, gymName), eq(spotterRequests.status, 'open')));
  } else {
    results = await db
      .select({
        request: spotterRequests,
        requester: {
          clerkId: users.clerkId,
          username: users.username,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(spotterRequests)
      .leftJoin(users, eq(spotterRequests.requesterId, users.clerkId))
      .where(eq(spotterRequests.status, 'open'));
  }

  // Filter expired requests client-side (or handle in DB)
  const active = results.filter((r) => {
    if (!r.request.expiresAt) return true;
    return new Date(r.request.expiresAt) > now;
  });

  return NextResponse.json(active);
}

export async function PATCH(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json() as { id: number; action: 'accept' | 'close' };

  if (!body.id || !body.action) {
    return NextResponse.json({ error: 'id and action are required' }, { status: 400 });
  }

  if (body.action === 'accept') {
    const [updated] = await db
      .update(spotterRequests)
      .set({ status: 'accepted', acceptedById: userId })
      .where(eq(spotterRequests.id, body.id))
      .returning();
    return NextResponse.json(updated);
  } else if (body.action === 'close') {
    const [updated] = await db
      .update(spotterRequests)
      .set({ status: 'closed' })
      .where(eq(spotterRequests.id, body.id))
      .returning();
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
