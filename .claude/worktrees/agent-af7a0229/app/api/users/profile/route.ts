import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (result.length === 0) {
      return NextResponse.json(null);
    }
    return NextResponse.json(result[0]);
  } catch (err) {
    console.error('GET /api/users/profile error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json() as {
      username?: string;
      bio?: string;
      sportTypes?: string[];
      pacePerKm?: number | null;
      weeklyKm?: number | null;
      city?: string;
      lat?: number | null;
      lon?: number | null;
      availability?: string[];
      avatarUrl?: string | null;
      gymName?: string | null;
      strengthLevel?: string | null;
      trainingSplits?: string[];
      goals?: string[];
      heightCm?: number | null;
      // Advanced athlete fields
      athleteLevel?: string | null;
      ftpWatts?: number | null;
      vo2max?: number | null;
      restingHr?: number | null;
      maxHr?: number | null;
      // Demographics
      age?: number | null;
      gender?: string | null;
      weightKg?: number | null;
      profileSongUrl?: string | null;
    };

    const existing = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);

    if (existing.length === 0) {
      const [created] = await db
        .insert(users)
        .values({
          clerkId: userId,
          username: body.username ?? null,
          bio: body.bio ?? null,
          avatarUrl: body.avatarUrl ?? null,
          sportTypes: body.sportTypes ?? [],
          pacePerKm: body.pacePerKm ?? null,
          weeklyKm: body.weeklyKm ?? null,
          city: body.city ?? null,
          lat: body.lat ?? null,
          lon: body.lon ?? null,
          availability: body.availability ?? [],
          gymName: body.gymName ?? null,
          strengthLevel: body.strengthLevel ?? null,
          trainingSplits: body.trainingSplits ?? [],
          goals: body.goals ?? [],
          heightCm: body.heightCm ?? null,
          athleteLevel: body.athleteLevel ?? null,
          ftpWatts: body.ftpWatts ?? null,
          vo2max: body.vo2max ?? null,
          restingHr: body.restingHr ?? null,
          maxHr: body.maxHr ?? null,
          age: body.age ?? null,
          gender: body.gender ?? null,
          weightKg: body.weightKg ?? null,
          profileSongUrl: body.profileSongUrl ?? null,
        })
        .returning();
      return NextResponse.json(created);
    } else {
      const [updated] = await db
        .update(users)
        .set({
          username: body.username !== undefined ? body.username : existing[0].username,
          bio: body.bio !== undefined ? body.bio : existing[0].bio,
          avatarUrl: body.avatarUrl !== undefined ? body.avatarUrl : existing[0].avatarUrl,
          sportTypes: body.sportTypes ?? existing[0].sportTypes,
          pacePerKm: body.pacePerKm !== undefined ? body.pacePerKm : existing[0].pacePerKm,
          weeklyKm: body.weeklyKm !== undefined ? body.weeklyKm : existing[0].weeklyKm,
          city: body.city !== undefined ? body.city : existing[0].city,
          lat: body.lat !== undefined ? body.lat : existing[0].lat,
          lon: body.lon !== undefined ? body.lon : existing[0].lon,
          availability: body.availability ?? existing[0].availability,
          gymName: body.gymName !== undefined ? body.gymName : existing[0].gymName,
          strengthLevel: body.strengthLevel !== undefined ? body.strengthLevel : existing[0].strengthLevel,
          trainingSplits: body.trainingSplits !== undefined ? body.trainingSplits : existing[0].trainingSplits,
          goals: body.goals !== undefined ? body.goals : existing[0].goals,
          heightCm: body.heightCm !== undefined ? body.heightCm : existing[0].heightCm,
          athleteLevel: body.athleteLevel !== undefined ? body.athleteLevel : existing[0].athleteLevel,
          ftpWatts: body.ftpWatts !== undefined ? body.ftpWatts : existing[0].ftpWatts,
          vo2max: body.vo2max !== undefined ? body.vo2max : existing[0].vo2max,
          restingHr: body.restingHr !== undefined ? body.restingHr : existing[0].restingHr,
          maxHr: body.maxHr !== undefined ? body.maxHr : existing[0].maxHr,
          age: body.age !== undefined ? body.age : existing[0].age,
          gender: body.gender !== undefined ? body.gender : existing[0].gender,
          weightKg: body.weightKg !== undefined ? body.weightKg : existing[0].weightKg,
          profileSongUrl: body.profileSongUrl !== undefined ? body.profileSongUrl : existing[0].profileSongUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.clerkId, userId))
        .returning();
      return NextResponse.json(updated);
    }
  } catch (err) {
    console.error('PUT /api/users/profile error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
