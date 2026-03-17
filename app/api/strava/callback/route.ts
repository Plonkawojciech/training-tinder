import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { stravaTokens, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { signToken, COOKIE_NAME } from '@/lib/jwt';
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

async function importStravaData(userId: string, athlete: StravaAthlete, accessToken: string) {
  // 1. Athlete stats (all-time, YTD, recent for run/ride/swim)
  const stats = await fetchStravaApi<StravaStats>(
    `https://www.strava.com/api/v3/athletes/${athlete.id}/stats`,
    accessToken
  );

  // Store full stats JSON
  await db.update(users).set({ stravaStatsJson: stats as Record<string, unknown> })
    .where(eq(users.clerkId, userId));

  // 2. Sport profiles + user weekly km
  const { detectedSports, weeklyKm } = await updateSportProfiles(userId, stats, { ftp: athlete.ftp });

  if (detectedSports.length === 0) detectedSports.push('running');

  await db.update(users).set({
    sportTypes: detectedSports,
    weeklyKm,
    ftpWatts: athlete.ftp ? Math.round(athlete.ftp) : null,
  }).where(eq(users.clerkId, userId));

  // 3. Import gear (bikes + shoes)
  try {
    await importStravaGear(userId, athlete);
  } catch (err) {
    console.error('Error importing gear:', err);
  }

  // 4. Activities — fetch up to 200
  const allActivities = await fetchStravaActivities(accessToken, 4);

  // 5. Update user location
  await updateUserLocation(userId, allActivities);

  // 6. Upsert activities + collect best efforts
  const { bestEffortsMap } = await upsertActivitiesAndCollectBestEfforts(userId, allActivities);

  // 7. Upsert best efforts
  await upsertBestEfforts(userId, bestEffortsMap);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const isAuthMode = state === 'auth';
  // Derive base URL from request host
  const reqUrl = new URL(req.url);
  const appUrl = `${reqUrl.protocol}//${reqUrl.host}`;

  const stravaError = searchParams.get('error');
  if (!code) {
    const isLimit = stravaError === 'access_denied';
    const errParam = isLimit ? 'strava=limit' : 'strava=error';
    return NextResponse.redirect(
      isAuthMode ? `${appUrl}/login?error=strava` : `${appUrl}/profile?${errParam}`
    );
  }

  let existingUserId: string | null = null;
  if (!isAuthMode) {
    existingUserId = await getAuthUserId();
    if (!existingUserId) return NextResponse.redirect(`${appUrl}/login`);
  }

  try {
    const tokenRes = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('Token exchange failed:', errText);
      const isLimit = tokenRes.status === 403 ||
        errText.includes('forbidden') || errText.includes('Authorization Error');
      const errParam = isLimit ? 'strava=limit' : 'strava=error';
      return NextResponse.redirect(
        isAuthMode ? `${appUrl}/login?error=strava` : `${appUrl}/profile?${errParam}`
      );
    }

    const tokenData = await tokenRes.json() as {
      access_token: string;
      refresh_token: string;
      expires_at: number;
      athlete: StravaAthlete;
    };

    const { athlete } = tokenData;
    const stravaAthleteId = String(athlete.id);
    const expiresAt = new Date(tokenData.expires_at * 1000);
    const accessToken = tokenData.access_token;

    if (isAuthMode) {
      // AUTH MODE: login or create account
      const existingRows = await db.select().from(users)
        .where(eq(users.stravaId, stravaAthleteId));

      let userId: string;

      if (existingRows.length > 0) {
        userId = existingRows[0].clerkId;
        await db.update(users).set({
          avatarUrl: athlete.profile || athlete.profile_medium || existingRows[0].avatarUrl,
        }).where(eq(users.clerkId, userId));
      } else {
        userId = `strava:${stravaAthleteId}`;
        const fullName = `${athlete.firstname ?? ''} ${athlete.lastname ?? ''}`.trim();
        const city = [athlete.city, athlete.country].filter(Boolean).join(', ') || null;

        await db.insert(users).values({
          clerkId: userId,
          username: fullName || `athlete_${stravaAthleteId}`,
          avatarUrl: athlete.profile || athlete.profile_medium || null,
          stravaId: stravaAthleteId,
          city,
          gender: athlete.sex === 'F' ? 'Kobieta' : athlete.sex === 'M' ? 'Mężczyzna' : null,
          weightKg: athlete.weight || null,
          sportTypes: [],
        });
      }

      await db.insert(stravaTokens).values({
        userId, stravaAthleteId, accessToken,
        refreshToken: tokenData.refresh_token, expiresAt,
      }).onConflictDoUpdate({
        target: stravaTokens.userId,
        set: { stravaAthleteId, accessToken, refreshToken: tokenData.refresh_token, expiresAt },
      });

      try {
        await importStravaData(userId, athlete, accessToken);
      } catch (err) {
        console.error('Strava import error:', err);
      }

      const jwt = await signToken(userId);
      const response = NextResponse.redirect(`${appUrl}/dashboard`);
      response.cookies.set(COOKIE_NAME, jwt, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
        sameSite: 'lax',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      });
      return response;

    } else {
      // CONNECT MODE: link Strava to existing user
      await db.insert(stravaTokens).values({
        userId: existingUserId!, stravaAthleteId, accessToken,
        refreshToken: tokenData.refresh_token, expiresAt,
      }).onConflictDoUpdate({
        target: stravaTokens.userId,
        set: { stravaAthleteId, accessToken, refreshToken: tokenData.refresh_token, expiresAt },
      });

      const updatePayload: Record<string, unknown> = {
        stravaId: stravaAthleteId,
      };
      if (athlete.profile || athlete.profile_medium) {
        updatePayload.avatarUrl = athlete.profile || athlete.profile_medium;
      }
      if (athlete.city) {
        updatePayload.city = [athlete.city, athlete.country].filter(Boolean).join(', ') || athlete.city;
      }
      await db.update(users).set(updatePayload).where(eq(users.clerkId, existingUserId!));

      try {
        await importStravaData(existingUserId!, athlete, accessToken);
      } catch (err) {
        console.error('Strava import error (connect):', err);
      }

      return NextResponse.redirect(`${appUrl}/profile?strava=connected`);
    }

  } catch (err) {
    console.error('Strava callback error:', err);
    return NextResponse.redirect(
      isAuthMode ? `${appUrl}/login?error=strava` : `${appUrl}/profile?strava=error`
    );
  }
}
