import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { sessions, sessionParticipants, users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const sport = searchParams.get('sport');
  const mine = searchParams.get('mine') === 'true';

  try {
    let query = db.select().from(sessions).orderBy(desc(sessions.createdAt));
    if (mine) {
      query = db
        .select()
        .from(sessions)
        .where(eq(sessions.creatorId, userId))
        .orderBy(desc(sessions.createdAt)) as typeof query;
    }

    const allSessions = await query;

    const filtered = sport
      ? allSessions.filter((s) => s.sportType === sport)
      : allSessions;

    // Get participant counts for each session
    const enriched = await Promise.all(
      filtered.map(async (session) => {
        const participants = await db
          .select()
          .from(sessionParticipants)
          .where(eq(sessionParticipants.sessionId, session.id));

        const creator = await db
          .select({ username: users.username })
          .from(users)
          .where(eq(users.clerkId, session.creatorId))
          .limit(1);

        return {
          ...session,
          participantCount: participants.length,
          creatorName: creator[0]?.username ?? null,
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (err) {
    console.error('GET /api/sessions error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json() as {
      title: string;
      sportType: string;
      date: string;
      time: string;
      location: string;
      lat?: number;
      lon?: number;
      maxParticipants?: number;
      gpxUrl?: string;
      description?: string;
    };

    const [session] = await db
      .insert(sessions)
      .values({
        creatorId: userId,
        title: body.title,
        sportType: body.sportType,
        date: body.date,
        time: body.time,
        location: body.location,
        lat: body.lat ?? null,
        lon: body.lon ?? null,
        maxParticipants: body.maxParticipants ?? 10,
        gpxUrl: body.gpxUrl ?? null,
        description: body.description ?? null,
        status: 'open',
      })
      .returning();

    // Auto-join as creator
    await db.insert(sessionParticipants).values({
      sessionId: session.id,
      userId,
    });

    return NextResponse.json(session);
  } catch (err) {
    console.error('POST /api/sessions error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
