import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, ne, sql } from 'drizzle-orm';
import { rankMatches, filterByLocation, filterBySport, type UserForMatching } from '@/lib/matching';

export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const sport = searchParams.get('sport') ?? 'all';
  const radius = Math.max(1, parseInt(searchParams.get('radius') ?? '100') || 100);

  // Advanced filter params
  const minPace = searchParams.get('minPace') ? parseInt(searchParams.get('minPace')!) : null; // sec/km
  const maxPace = searchParams.get('maxPace') ? parseInt(searchParams.get('maxPace')!) : null; // sec/km
  const level = searchParams.get('level'); // beginner/recreational/competitive/elite
  const minWeeklyKm = searchParams.get('minWeeklyKm') ? parseInt(searchParams.get('minWeeklyKm')!) : null;
  const maxWeeklyKm = searchParams.get('maxWeeklyKm') ? parseInt(searchParams.get('maxWeeklyKm')!) : null;
  const verified = searchParams.get('verified') === 'true';

  try {
    const currentUserRows = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1);

    if (currentUserRows.length === 0) {
      return NextResponse.json([]);
    }

    const currentUser = currentUserRows[0];

    // Pre-filter at DB level: bounding box when user has location, always exclude self
    const radiusKmToLatDelta = radius / 111.32;
    const radiusKmToLonDelta = currentUser.lat
      ? radius / (111.32 * Math.cos((currentUser.lat * Math.PI) / 180))
      : radius / 111.32;

    const locationCondition =
      currentUser.lat !== null && currentUser.lon !== null
        ? sql`(${users.lat} IS NULL OR (
            ${users.lat} BETWEEN ${currentUser.lat - radiusKmToLatDelta} AND ${currentUser.lat + radiusKmToLatDelta}
            AND ${users.lon} BETWEEN ${currentUser.lon - radiusKmToLonDelta} AND ${currentUser.lon + radiusKmToLonDelta}
          ))`
        : sql`1=1`;

    const allUsers = await db
      .select()
      .from(users)
      .where(sql`${users.clerkId} != ${userId} AND ${locationCondition}`)
      .limit(500);

    const currentForMatch: UserForMatching = {
      id: String(currentUser.id),
      clerkId: currentUser.clerkId,
      username: currentUser.username,
      avatarUrl: currentUser.avatarUrl,
      bio: currentUser.bio,
      sportTypes: currentUser.sportTypes ?? [],
      pacePerKm: currentUser.pacePerKm,
      weeklyKm: currentUser.weeklyKm,
      city: currentUser.city,
      lat: currentUser.lat,
      lon: currentUser.lon,
      gymName: currentUser.gymName,
      strengthLevel: currentUser.strengthLevel,
      trainingSplits: (currentUser.trainingSplits as string[] | null) ?? [],
      goals: (currentUser.goals as string[] | null) ?? [],
      availability: (currentUser.availability as string[] | null) ?? [],
    };

    type RawUser = typeof allUsers[0];
    type ExtendedCandidate = UserForMatching & { _raw: RawUser };

    let extCandidates: ExtendedCandidate[] = allUsers
      .map((u) => ({
        id: String(u.id),
        clerkId: u.clerkId,
        username: u.username,
        avatarUrl: u.avatarUrl,
        bio: u.bio,
        sportTypes: u.sportTypes ?? [],
        pacePerKm: u.pacePerKm,
        weeklyKm: u.weeklyKm,
        city: u.city,
        lat: u.lat,
        lon: u.lon,
        gymName: u.gymName,
        strengthLevel: u.strengthLevel,
        trainingSplits: (u.trainingSplits as string[] | null) ?? [],
        goals: (u.goals as string[] | null) ?? [],
        availability: (u.availability as string[] | null) ?? [],
        _raw: u,
      }));

    // Apply advanced filters
    if (minPace !== null || maxPace !== null || level || minWeeklyKm !== null || maxWeeklyKm !== null || verified) {
      extCandidates = extCandidates.filter((c) => {
        const raw = c._raw;
        if (minPace !== null && (raw.pacePerKm === null || raw.pacePerKm < minPace)) return false;
        if (maxPace !== null && (raw.pacePerKm === null || raw.pacePerKm > maxPace)) return false;
        if (level && raw.athleteLevel !== level) return false;
        if (minWeeklyKm !== null && (raw.weeklyKm === null || raw.weeklyKm < minWeeklyKm)) return false;
        if (maxWeeklyKm !== null && (raw.weeklyKm === null || raw.weeklyKm > maxWeeklyKm)) return false;
        if (verified && !raw.stravaVerified) return false;
        return true;
      });
    }

    // Strip _raw before ranking
    const candidatesClean: UserForMatching[] = extCandidates.map(({ _raw: _r, ...rest }) => rest);

    let ranked = rankMatches(currentForMatch, candidatesClean);
    ranked = filterByLocation(ranked, radius);
    if (sport !== 'all') ranked = filterBySport(ranked, sport);

    // Build raw user lookup for enrichment (already in memory)
    const rawUserMap = Object.fromEntries(extCandidates.map((c) => [c.clerkId, c._raw]));

    const enriched = ranked.map((r) => {
      const raw = rawUserMap[r.user.clerkId];
      const isVerified = raw?.stravaVerified ?? false;
      return {
        ...r,
        score: isVerified ? Math.min(100, r.score + 10) : r.score,
        user: {
          ...r.user,
          stravaVerified: isVerified,
          profileSongUrl: raw?.profileSongUrl ?? null,
          ftpWatts: raw?.ftpWatts ?? null,
        },
      };
    });

    return NextResponse.json(enriched);
  } catch (err) {
    console.error('GET /api/discover error:', err);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
