import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { stravaTokens, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  type StravaAthlete,
  type StravaStats,
  fetchStravaApi,
  updateSportProfiles,
  importStravaGear,
  fetchStravaActivities,
  updateUserLocation,
  upsertActivitiesAndCollectBestEfforts,
  upsertBestEfforts,
} from '@/lib/strava';

async function refreshStravaToken(token: { userId: string; refreshToken: string }) {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: token.refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error('Failed to refresh Strava token');
  const data = await res.json() as { access_token: string; refresh_token: string; expires_at: number };
  const expiresAt = new Date(data.expires_at * 1000);
  await db.update(stravaTokens).set({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt,
  }).where(eq(stravaTokens.userId, token.userId));
  return { accessToken: data.access_token, expiresAt };
}

export async function POST() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

  const tokenRows = await db.select().from(stravaTokens).where(eq(stravaTokens.userId, userId));
  if (tokenRows.length === 0) return NextResponse.json({ error: 'Strava not connected' }, { status: 400 });

  let { accessToken } = tokenRows[0];
  const { expiresAt, refreshToken, stravaAthleteId } = tokenRows[0];

  if (expiresAt.getTime() < Date.now() + 60_000) {
    const refreshed = await refreshStravaToken({ userId, refreshToken });
    accessToken = refreshed.accessToken;
  }

  // 1. Sync athlete stats
  try {
    const stats = await fetchStravaApi<StravaStats>(
      `https://www.strava.com/api/v3/athletes/${stravaAthleteId}/stats`,
      accessToken,
    );

    await db.update(users).set({
      stravaStatsJson: stats as Record<string, unknown>,
    }).where(eq(users.clerkId, userId));

    const { weeklyKm } = await updateSportProfiles(userId, stats);

    await db.update(users).set({ weeklyKm }).where(eq(users.clerkId, userId));
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
      await db.update(users).set(profileUpdate).where(eq(users.clerkId, userId));
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
