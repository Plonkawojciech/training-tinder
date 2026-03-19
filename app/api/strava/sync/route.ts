import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { stravaTokens, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { unauthorized, badRequest, apiError, ErrorCode } from '@/lib/api-errors';
import {
  type StravaAthlete,
  type StravaStats,
  fetchStravaApi,
  refreshStravaTokenIfNeeded,
  updateSportProfiles,
  importStravaGear,
  fetchStravaActivities,
  updateUserLocation,
  upsertActivitiesAndCollectBestEfforts,
  upsertBestEfforts,
} from '@/lib/strava';

export async function POST() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const tokenRows = await db.select().from(stravaTokens).where(eq(stravaTokens.userId, userId));
  if (tokenRows.length === 0) return badRequest(ErrorCode.STRAVA_CONNECTION_ERROR, 'Strava not connected');

  let accessToken: string;
  const { stravaAthleteId } = tokenRows[0];

  try {
    accessToken = await refreshStravaTokenIfNeeded(tokenRows[0]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'STRAVA_TOKEN_REVOKED') {
      return apiError(ErrorCode.STRAVA_TOKEN_EXPIRED, 'Strava token revoked. Please reconnect your account.', 401);
    }
    return badRequest(ErrorCode.STRAVA_CONNECTION_ERROR, 'Failed to refresh Strava token');
  }

  // 1. Sync athlete stats
  try {
    const stats = await fetchStravaApi<StravaStats>(
      `https://www.strava.com/api/v3/athletes/${stravaAthleteId}/stats`,
      accessToken,
    );

    await db.update(users).set({
      stravaStatsJson: stats as Record<string, unknown>,
    }).where(eq(users.authEmail, userId));

    const { weeklyKm } = await updateSportProfiles(userId, stats);

    await db.update(users).set({ weeklyKm }).where(eq(users.authEmail, userId));
  } catch (err) {
    console.error('Failed to sync Strava stats:', err);
  }

  // 2. Sync gear from athlete profile
  try {
    const athlete = await fetchStravaApi<Partial<StravaAthlete>>(
      'https://www.strava.com/api/v3/athlete',
      accessToken,
    );

    // Refresh profile fields from Strava athlete
    const profileUpdate: Record<string, unknown> = {};
    if (athlete.profile || athlete.profile_medium) {
      profileUpdate.avatarUrl = athlete.profile ?? athlete.profile_medium;
    }
    if (athlete.city) profileUpdate.city = athlete.city;
    if (Object.keys(profileUpdate).length > 0) {
      await db.update(users).set(profileUpdate).where(eq(users.authEmail, userId));
    }

    await importStravaGear(userId, {
      bikes: athlete.bikes ?? [],
      shoes: athlete.shoes ?? [],
    });
  } catch (err) {
    console.error('Failed to sync Strava gear:', err);
  }

  // 3. Sync activities (up to 200)
  const allActivities = await fetchStravaActivities(accessToken, 4);

  // Update user location
  await updateUserLocation(userId, allActivities);

  // Upsert activities + collect best efforts
  const { synced, bestEffortsMap } = await upsertActivitiesAndCollectBestEfforts(userId, allActivities);

  // Upsert best efforts
  await upsertBestEfforts(userId, bestEffortsMap);

  return NextResponse.json({ synced, pagesChecked: Math.ceil(synced / 50) + 1 });
}
