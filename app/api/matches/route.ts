import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { users, matches } from '@/lib/db/schema';
import { eq, and, or, sql } from 'drizzle-orm';
import { rankMatches, filterByLocation, filterBySport, type UserForMatching } from '@/lib/matching';

export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const sport = searchParams.get('sport') ?? 'all';
  const maxDistanceKm = Math.max(1, parseInt(searchParams.get('radius') ?? '50') || 50);

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

    // Pre-filter by bbox when user has location
    const radiusKmToLatDelta = maxDistanceKm / 111.32;
    const radiusKmToLonDelta = currentUser.lat
      ? maxDistanceKm / (111.32 * Math.cos((currentUser.lat * Math.PI) / 180))
      : maxDistanceKm / 111.32;

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
    };

    const candidates: UserForMatching[] = allUsers
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
      }));

    let ranked = rankMatches(currentForMatch, candidates);
    ranked = filterByLocation(ranked, maxDistanceKm);
    if (sport !== 'all') ranked = filterBySport(ranked, sport);

    return NextResponse.json(ranked);
  } catch (err) {
    console.error('GET /api/matches error:', err);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

  try {
    const { targetClerkId, score } = await request.json() as { targetClerkId: string; score: number };

    const existing = await db
      .select()
      .from(matches)
      .where(
        or(
          and(eq(matches.user1Id, userId), eq(matches.user2Id, targetClerkId)),
          and(eq(matches.user1Id, targetClerkId), eq(matches.user2Id, userId))
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(existing[0]);
    }

    const [match] = await db
      .insert(matches)
      .values({ user1Id: userId, user2Id: targetClerkId, score })
      .returning();

    return NextResponse.json(match);
  } catch (err) {
    console.error('POST /api/matches error:', err);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
