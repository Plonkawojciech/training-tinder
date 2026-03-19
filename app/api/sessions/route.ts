import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { sessions, sessionParticipants, users } from '@/lib/db/schema';
import { eq, desc, inArray, and, gte, lte } from 'drizzle-orm';
import { unauthorized, serverError, badRequest, ErrorCode } from '@/lib/api-errors';

export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

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
    // Build WHERE conditions at the DB level
    const conditions = [];
    if (mine) {
      conditions.push(eq(sessions.creatorId, userId));
    }
    if (sport) {
      conditions.push(eq(sessions.sportType, sport));
    }
    if (bboxFilter) {
      conditions.push(gte(sessions.lat, bboxFilter.minLat));
      conditions.push(lte(sessions.lat, bboxFilter.maxLat));
      conditions.push(gte(sessions.lon, bboxFilter.minLon));
      conditions.push(lte(sessions.lon, bboxFilter.maxLon));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const allSessions = await db
      .select()
      .from(sessions)
      .where(whereClause)
      .orderBy(desc(sessions.createdAt));

    let filtered = allSessions;

    // Filter out 'friends'-privacy sessions that user is not a creator/participant of
    if (!mine) {
      const privateSessions = filtered.filter(
        (s) => s.privacy === 'friends' && s.creatorId !== userId
      );
      if (privateSessions.length > 0) {
        const privateIds = privateSessions.map((s) => s.id);
        const userMemberships = await db
          .select({ sessionId: sessionParticipants.sessionId })
          .from(sessionParticipants)
          .where(and(inArray(sessionParticipants.sessionId, privateIds), eq(sessionParticipants.userId, userId)));
        const memberSet = new Set(userMemberships.map((m) => m.sessionId));
        filtered = filtered.filter(
          (s) => s.privacy !== 'friends' || s.creatorId === userId || memberSet.has(s.id)
        );
      }
    }

    if (filtered.length === 0) return NextResponse.json([]);

    // Batch-fetch participant counts and creator names (no N+1)
    const sessionIds = filtered.map((s) => s.id);
    const creatorIds = [...new Set(filtered.map((s) => s.creatorId))];

    const [allParticipants, allCreators] = await Promise.all([
      db.select({ sessionId: sessionParticipants.sessionId })
        .from(sessionParticipants)
        .where(inArray(sessionParticipants.sessionId, sessionIds)),
      db.select({ authEmail: users.authEmail, username: users.username })
        .from(users)
        .where(inArray(users.authEmail, creatorIds)),
    ]);

    const countMap: Record<number, number> = {};
    for (const p of allParticipants) {
      countMap[p.sessionId] = (countMap[p.sessionId] ?? 0) + 1;
    }
    const creatorMap = Object.fromEntries(allCreators.map((u) => [u.authEmail, u.username]));

    const enriched = filtered.map((session) => ({
      ...session,
      participantCount: countMap[session.id] ?? 0,
      creatorName: creatorMap[session.creatorId] ?? null,
    }));

    return NextResponse.json(enriched);
  } catch (err) {
    console.error('GET /api/sessions error:', err);
    return serverError();
  }
}

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const body = await request.json() as {
      title?: unknown;
      sportType?: unknown;
      date?: unknown;
      time?: unknown;
      location?: unknown;
      lat?: unknown;
      lon?: unknown;
      maxParticipants?: unknown;
      gpxUrl?: unknown;
      description?: unknown;
      gymName?: unknown;
      workoutType?: unknown;
      strengthLevelRequired?: unknown;
      equipmentNeeded?: unknown;
      estimatedDistanceKm?: unknown;
      estimatedDurationMin?: unknown;
      targetAvgPowerWatts?: unknown;
      elevationGainM?: unknown;
      stops?: unknown;
      privacy?: unknown;
      targetPaceSecPerKm?: unknown;
      terrain?: unknown;
    };

    // Required field validation
    if (typeof body.title !== 'string' || body.title.trim().length < 2) {
      return badRequest(ErrorCode.TITLE_TOO_SHORT, 'Title is required (min 2 characters)');
    }
    if (body.title.trim().length > 120) {
      return badRequest(ErrorCode.INVALID_INPUT, 'Title must be 120 characters or less');
    }
    if (typeof body.sportType !== 'string' || !body.sportType.trim()) {
      return badRequest(ErrorCode.MISSING_FIELDS, 'Sport type is required');
    }
    if (typeof body.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
      return badRequest(ErrorCode.INVALID_DATE, 'Invalid date format (YYYY-MM-DD)');
    }
    if (typeof body.time !== 'string' || !/^\d{2}:\d{2}$/.test(body.time)) {
      return badRequest(ErrorCode.INVALID_TIME, 'Invalid time format (HH:MM)');
    }
    if (typeof body.location !== 'string' || body.location.trim().length < 2) {
      return badRequest(ErrorCode.MISSING_FIELDS, 'Location is required');
    }

    // Numeric bounds
    const maxParticipants = body.maxParticipants !== undefined ? Number(body.maxParticipants) : 10;
    if (!Number.isInteger(maxParticipants) || maxParticipants < 2 || maxParticipants > 200) {
      return badRequest(ErrorCode.INVALID_INPUT, 'Max participants must be between 2 and 200');
    }
    const lat = body.lat !== undefined ? Number(body.lat) : null;
    const lon = body.lon !== undefined ? Number(body.lon) : null;
    if (lat !== null && (isNaN(lat) || lat < -90 || lat > 90)) {
      return badRequest(ErrorCode.INVALID_COORDINATES, 'Invalid latitude');
    }
    if (lon !== null && (isNaN(lon) || lon < -180 || lon > 180)) {
      return badRequest(ErrorCode.INVALID_COORDINATES, 'Invalid longitude');
    }

    // Safe optional strings
    const description = typeof body.description === 'string' ? body.description.trim().slice(0, 2000) : null;
    const gymName = typeof body.gymName === 'string' ? body.gymName.trim().slice(0, 150) : null;
    const workoutType = typeof body.workoutType === 'string' ? body.workoutType.trim().slice(0, 60) : null;
    const strengthLevelRequired = typeof body.strengthLevelRequired === 'string' ? body.strengthLevelRequired.trim().slice(0, 60) : null;
    const targetPaceSecPerKm = typeof body.targetPaceSecPerKm === 'string' ? body.targetPaceSecPerKm.slice(0, 20) : null;
    const terrain = typeof body.terrain === 'string' ? body.terrain.slice(0, 60) : null;
    const gpxUrl = typeof body.gpxUrl === 'string' ? body.gpxUrl.slice(0, 500) : null;
    const privacy = body.privacy === 'friends' ? 'friends' : 'public';

    // Arrays with limits
    const equipmentNeeded = Array.isArray(body.equipmentNeeded)
      ? (body.equipmentNeeded as unknown[]).slice(0, 20).filter((e) => typeof e === 'string').map((e) => (e as string).slice(0, 60))
      : [];
    const stops = Array.isArray(body.stops)
      ? (body.stops as unknown[]).slice(0, 10).filter((s) => s && typeof s === 'object').map((s) => {
          const stop = s as Record<string, unknown>;
          return { name: String(stop.name ?? '').slice(0, 100), location: String(stop.location ?? '').slice(0, 200) };
        })
      : [];

    const estimatedDistanceKm = body.estimatedDistanceKm !== undefined ? Number(body.estimatedDistanceKm) : null;
    const estimatedDurationMin = body.estimatedDurationMin !== undefined ? Number(body.estimatedDurationMin) : null;
    const targetAvgPowerWatts = body.targetAvgPowerWatts !== undefined ? Number(body.targetAvgPowerWatts) : null;
    const elevationGainM = body.elevationGainM !== undefined ? Number(body.elevationGainM) : null;

    const [session] = await db
      .insert(sessions)
      .values({
        creatorId: userId,
        title: body.title.trim(),
        sportType: body.sportType.trim(),
        date: body.date,
        time: body.time,
        location: body.location.trim(),
        lat,
        lon,
        maxParticipants,
        gpxUrl,
        description,
        status: 'open',
        gymName,
        workoutType,
        strengthLevelRequired,
        equipmentNeeded,
        estimatedDistanceKm: estimatedDistanceKm !== null && !isNaN(estimatedDistanceKm) ? estimatedDistanceKm : null,
        estimatedDurationMin: estimatedDurationMin !== null && !isNaN(estimatedDurationMin) ? estimatedDurationMin : null,
        targetAvgPowerWatts: targetAvgPowerWatts !== null && !isNaN(targetAvgPowerWatts) ? targetAvgPowerWatts : null,
        elevationGainM: elevationGainM !== null && !isNaN(elevationGainM) ? elevationGainM : null,
        stops,
        privacy,
        targetPaceSecPerKm,
        terrain,
      })
      .returning();

    // Auto-join as creator with host status
    await db.insert(sessionParticipants).values({
      sessionId: session.id,
      userId,
      status: 'host',
    });

    return NextResponse.json(session);
  } catch (err) {
    console.error('POST /api/sessions error:', err);
    return serverError();
  }
}
