import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { userEvents, users } from '@/lib/db/schema';
import { eq, desc, or, gte } from 'drizzle-orm';

export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const includePublic = searchParams.get('public') !== 'false';

  try {
    // Fetch user's own events
    const myEvents = await db
      .select()
      .from(userEvents)
      .where(eq(userEvents.userId, userId))
      .orderBy(desc(userEvents.eventDate));

    if (!includePublic) {
      return NextResponse.json({ myEvents, publicEvents: [] });
    }

    // Fetch public events from other users (upcoming only)
    const today = new Date().toISOString().split('T')[0];
    const publicRows = await db
      .select({
        event: userEvents,
        username: users.username,
        avatarUrl: users.avatarUrl,
      })
      .from(userEvents)
      .leftJoin(users, eq(users.clerkId, userEvents.userId))
      .where(
        eq(userEvents.isPublic, true)
      )
      .orderBy(userEvents.eventDate)
      .limit(20);

    // Filter out own events and past events in JS to avoid complex query
    const publicEvents = publicRows
      .filter((r) => r.event.userId !== userId && r.event.eventDate >= today)
      .map((r) => ({
        ...r.event,
        creatorUsername: r.username,
        creatorAvatarUrl: r.avatarUrl,
      }));

    return NextResponse.json({ myEvents, publicEvents });
  } catch (err) {
    console.error('GET /api/events error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json() as {
      eventName: string;
      eventType: string;
      sport: string;
      eventDate: string;
      location?: string;
      distanceKm?: number;
      targetTimeSec?: number;
      status?: string;
      isPublic?: boolean;
    };

    if (!body.eventName || !body.eventType || !body.sport || !body.eventDate) {
      return NextResponse.json(
        { error: 'eventName, eventType, sport, and eventDate are required' },
        { status: 400 }
      );
    }

    const [created] = await db
      .insert(userEvents)
      .values({
        userId,
        eventName: body.eventName,
        eventType: body.eventType,
        sport: body.sport,
        eventDate: body.eventDate,
        location: body.location ?? null,
        distanceKm: body.distanceKm ?? null,
        targetTimeSec: body.targetTimeSec ?? null,
        status: body.status ?? 'registered',
        isPublic: body.isPublic ?? true,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error('POST /api/events error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
