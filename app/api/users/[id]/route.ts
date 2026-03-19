import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { unauthorized, notFound, serverError } from '@/lib/api-errors';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;

  try {
    const result = await db
      .select({
        authEmail: users.authEmail,
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
        profileVisibility: users.profileVisibility,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.authEmail, id))
      .limit(1);
    if (result.length === 0) {
      return notFound('User not found');
    }

    const profile = result[0];

    // Enforce profile visibility — only show full profile if public or if viewing own profile
    if (profile.profileVisibility === 'nobody' && id !== userId) {
      return notFound('User not found');
    }

    return NextResponse.json(profile);
  } catch (err) {
    console.error('GET /api/users/[id] error:', err);
    return serverError();
  }
}
