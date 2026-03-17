import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { gymCheckins, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json() as {
      gymName: string;
      gymPlaceId?: string;
      lat?: number;
      lng?: number;
      workoutType?: string;
    };

    if (!body.gymName) {
      return NextResponse.json({ error: 'gymName is required' }, { status: 400 });
    }

    // Deactivate any previous active checkins
    await db
      .update(gymCheckins)
      .set({ isActive: false, checkedOutAt: new Date() })
      .where(and(eq(gymCheckins.userId, userId), eq(gymCheckins.isActive, true)));

    const [checkin] = await db
      .insert(gymCheckins)
      .values({
        userId,
        gymName: body.gymName,
        gymPlaceId: body.gymPlaceId ?? null,
        lat: body.lat ?? null,
        lon: body.lng ?? null,
        workoutType: body.workoutType ?? null,
        isActive: true,
      })
      .returning();

    return NextResponse.json(checkin);
  } catch (err) {
    console.error('POST /api/checkin error:', err);
    return NextResponse.json({ error: 'Bad request or internal server error' }, { status: 400 });
  }
}

export async function DELETE() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await db
    .update(gymCheckins)
    .set({ isActive: false, checkedOutAt: new Date() })
    .where(and(eq(gymCheckins.userId, userId), eq(gymCheckins.isActive, true)));

  return NextResponse.json({ success: true });
}

export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const gymPlaceId = searchParams.get('gymPlaceId');
  const gymName = searchParams.get('gymName');

  // Get the requesting user's active checkin first
  const myCheckin = await db
    .select()
    .from(gymCheckins)
    .where(and(eq(gymCheckins.userId, userId), eq(gymCheckins.isActive, true)))
    .limit(1);

  let query;
  if (gymPlaceId) {
    query = db
      .select({
        checkin: gymCheckins,
        user: {
          clerkId: users.clerkId,
          username: users.username,
          avatarUrl: users.avatarUrl,
          sportTypes: users.sportTypes,
        },
      })
      .from(gymCheckins)
      .leftJoin(users, eq(gymCheckins.userId, users.clerkId))
      .where(and(eq(gymCheckins.gymPlaceId, gymPlaceId), eq(gymCheckins.isActive, true)));
  } else if (gymName) {
    query = db
      .select({
        checkin: gymCheckins,
        user: {
          clerkId: users.clerkId,
          username: users.username,
          avatarUrl: users.avatarUrl,
          sportTypes: users.sportTypes,
        },
      })
      .from(gymCheckins)
      .leftJoin(users, eq(gymCheckins.userId, users.clerkId))
      .where(and(eq(gymCheckins.gymName, gymName), eq(gymCheckins.isActive, true)));
  } else {
    // Return all active checkins
    query = db
      .select({
        checkin: gymCheckins,
        user: {
          clerkId: users.clerkId,
          username: users.username,
          avatarUrl: users.avatarUrl,
          sportTypes: users.sportTypes,
        },
      })
      .from(gymCheckins)
      .leftJoin(users, eq(gymCheckins.userId, users.clerkId))
      .where(eq(gymCheckins.isActive, true));
  }

  const results = await query;

  const validCheckins = results.filter((r) => r.user !== null);

  return NextResponse.json({
    myCheckin: myCheckin[0] ?? null,
    checkins: validCheckins,
  });
}
