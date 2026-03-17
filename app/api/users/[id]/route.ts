import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

  const { id } = await params;

  try {
    const result = await db
      .select({
        clerkId: users.clerkId,
        username: users.username,
        bio: users.bio,
        avatarUrl: users.avatarUrl,
        sportTypes: users.sportTypes,
        pacePerKm: users.pacePerKm,
        weeklyKm: users.weeklyKm,
        city: users.city,
        stravaVerified: users.stravaVerified,
        verifiedPacePerKm: users.verifiedPacePerKm,
        availability: users.availability,
        gymName: users.gymName,
        strengthLevel: users.strengthLevel,
        trainingSplits: users.trainingSplits,
        goals: users.goals,
        athleteLevel: users.athleteLevel,
        ftpWatts: users.ftpWatts,
        paceUnit: users.paceUnit,
        photoUrls: users.photoUrls,
        profileSongUrl: users.profileSongUrl,
        age: users.age,
        gender: users.gender,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.clerkId, id))
      .limit(1);
    if (result.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(result[0]);
  } catch (err) {
    console.error('GET /api/users/[id] error:', err);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
