import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { sessions, sessionParticipants, users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const sport = searchParams.get('sport');
  const mine = searchParams.get('mine') === 'true';
  const bbox = searchParams.get('bbox'); // format: lat1,lon1,lat2,lon2

  // Parse bbox if provided
  let bboxFilter: { minLat: number; minLon: number; maxLat: number; maxLon: number } | null = null;
  if (bbox) {
    const parts = bbox.split(',').map(Number);
    if (parts.length === 4 && parts.every((p) => !isNaN(p))) {
      const [lat1, lon1, lat2, lon2] = parts;
      bboxFilter = {
        minLat: Math.min(lat1, lat2),
        maxLat: Math.max(lat1, lat2),
        minLon: Math.min(lon1, lon2),
        maxLon: Math.max(lon1, lon2),
      };
    }
  }

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

    let filtered = sport
      ? allSessions.filter((s) => s.sportType === sport)
      : allSessions;

    // Apply bbox filter if provided
    if (bboxFilter) {
      const { minLat, maxLat, minLon, maxLon } = bboxFilter;
      filtered = filtered.filter((s) => {
        if (s.lat === null || s.lon === null) return false;
        return (
          s.lat >= minLat &&
          s.lat <= maxLat &&
          s.lon >= minLon &&
          s.lon <= maxLon
        );
      });
    }

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
  const userId = await getAuthUserId();
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
      gymName?: string;
      workoutType?: string;
      strengthLevelRequired?: string;
      equipmentNeeded?: string[];
      // Cycling/Running fields
      estimatedDistanceKm?: number;
      estimatedDurationMin?: number;
      targetAvgPowerWatts?: number;
      elevationGainM?: number;
      stops?: {name: string; location: string}[];
      privacy?: string;
      targetPaceSecPerKm?: string;
      terrain?: string;
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
        gymName: body.gymName ?? null,
        workoutType: body.workoutType ?? null,
        strengthLevelRequired: body.strengthLevelRequired ?? null,
        equipmentNeeded: body.equipmentNeeded ?? [],
        estimatedDistanceKm: body.estimatedDistanceKm ?? null,
        estimatedDurationMin: body.estimatedDurationMin ?? null,
        targetAvgPowerWatts: body.targetAvgPowerWatts ?? null,
        elevationGainM: body.elevationGainM ?? null,
        stops: body.stops ?? [],
        privacy: body.privacy ?? 'public',
        targetPaceSecPerKm: body.targetPaceSecPerKm ?? null,
        terrain: body.terrain ?? null,
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
