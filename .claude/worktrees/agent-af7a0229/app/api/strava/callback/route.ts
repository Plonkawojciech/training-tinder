import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { stravaTokens, stravaActivities, stravaGear, stravaBestEfforts, users, userSportProfiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

type StravaAthlete = {
  id: number;
  firstname: string;
  lastname: string;
  profile: string;
  profile_medium: string;
  city: string;
  state: string;
  country: string;
  sex: string;
  weight: number;
  ftp: number;
  follower_count: number;
  friend_count: number;
  measurement_preference: string;
  summit: boolean;
  bikes: Array<{
    id: string;
    name: string;
    distance: number;
    brand_name?: string;
    model_name?: string;
    description?: string;
    is_primary?: boolean;
  }>;
  shoes: Array<{
    id: string;
    name: string;
    distance: number;
    brand_name?: string;
    model_name?: string;
    description?: string;
    is_primary?: boolean;
  }>;
};

type StravaTotals = {
  count: number;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  elevation_gain: number;
  achievement_count?: number;
};

type StravaStats = {
  recent_run_totals: StravaTotals;
  recent_ride_totals: StravaTotals;
  recent_swim_totals: StravaTotals;
  ytd_run_totals: StravaTotals;
  ytd_ride_totals: StravaTotals;
  ytd_swim_totals: StravaTotals;
  all_run_totals: StravaTotals;
  all_ride_totals: StravaTotals;
  all_swim_totals: StravaTotals;
  biggest_ride_distance: number;
  biggest_climb_elevation_gain: number;
};

type StravaBestEffortItem = {
  name: string;
  distance: number;
  moving_time: number;
  start_date: string;
  activity: { id: number };
};

type StravaActivityItem = {
  id: number;
  sport_type: string;
  type: string;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  average_speed: number;
  max_speed: number;
  average_watts?: number;
  weighted_average_watts?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_cadence?: number;
  start_latlng?: [number, number];
  start_date: string;
  trainer: boolean;
  kudos_count: number;
  achievement_count: number;
  map?: { summary_polyline?: string };
  best_efforts?: StravaBestEffortItem[];
};

async function fetchStravaApi<T>(url: string, accessToken: string): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Strava API ${url} returned ${res.status}`);
  return res.json() as Promise<T>;
}

// Known best effort distances in meters
const BEST_EFFORT_DISTANCES: Record<string, number> = {
  '400m': 400,
  '1/2 mile': 805,
  '1k': 1000,
  '1 mile': 1609,
  '2 mile': 3219,
  '5k': 5000,
  '10k': 10000,
  '15k': 15000,
  '20k': 20000,
  'Half-Marathon': 21097,
  'Marathon': 42195,
};

async function importStravaData(userId: string, athlete: StravaAthlete, accessToken: string) {
  // ── 1. Athlete stats (all-time, YTD, recent for run/ride/swim) ──
  const stats = await fetchStravaApi<StravaStats>(
    `https://www.strava.com/api/v3/athletes/${athlete.id}/stats`,
    accessToken
  );

  // Store full stats JSON for later use
  await db.update(users).set({ stravaStatsJson: stats as Record<string, unknown> })
    .where(eq(users.clerkId, userId));

  const recentRunKm = (stats.recent_run_totals?.distance ?? 0) / 1000;
  const recentRideKm = (stats.recent_ride_totals?.distance ?? 0) / 1000;
  const recentSwimKm = (stats.recent_swim_totals?.distance ?? 0) / 1000;
  const allRunKm = (stats.all_run_totals?.distance ?? 0) / 1000;
  const allRideKm = (stats.all_ride_totals?.distance ?? 0) / 1000;
  const allSwimKm = (stats.all_swim_totals?.distance ?? 0) / 1000;

  // Detect sports from activity history
  const detectedSports: string[] = [];
  if (recentRunKm > 0 || allRunKm > 5) detectedSports.push('running');
  if (recentRideKm > 0 || allRideKm > 20) detectedSports.push('cycling');
  if (recentSwimKm > 0 || allSwimKm > 5) detectedSports.push('swimming');
  if (detectedSports.length === 0) detectedSports.push('running');

  const weeklyRunKm = Math.round(recentRunKm / 4);
  const weeklyRideKm = Math.round(recentRideKm / 4);
  const weeklySwimKm = Math.round(recentSwimKm / 4);
  const weeklyKm = Math.max(weeklyRunKm, weeklyRideKm, weeklySwimKm) || null;

  await db.update(users).set({
    sportTypes: detectedSports,
    weeklyKm,
    ftpWatts: athlete.ftp ? Math.round(athlete.ftp) : null,
  }).where(eq(users.clerkId, userId));

  // ── 2. Sport profiles ──
  const existingProfiles = await db.select().from(userSportProfiles)
    .where(eq(userSportProfiles.userId, userId));

  const upsertSportProfile = async (
    sport: string,
    data: Partial<typeof userSportProfiles.$inferInsert>
  ) => {
    const existing = existingProfiles.find(p => p.sport === sport);
    if (!existing) {
      await db.insert(userSportProfiles).values({ userId, sport, ...data });
    } else {
      await db.update(userSportProfiles).set(data).where(eq(userSportProfiles.id, existing.id));
    }
  };

  if (recentRunKm > 0 || allRunKm > 5) {
    const run = stats.recent_run_totals;
    const avgPaceSec = (run.count > 0 && run.distance > 0)
      ? Math.round(run.moving_time / (run.distance / 1000))
      : null;
    const weeklyHours = run.moving_time > 0 ? Math.round((run.moving_time / 3600) / 4 * 10) / 10 : null;

    await upsertSportProfile('running', {
      weeklyKm: weeklyRunKm || null,
      pacePerKmSec: avgPaceSec,
      weeklyHours,
    });
  }

  if (recentRideKm > 0 || allRideKm > 20) {
    const ride = stats.recent_ride_totals;
    const avgSpeedKmh = (ride.count > 0 && ride.moving_time > 0)
      ? Math.round((ride.distance / 1000) / (ride.moving_time / 3600) * 10) / 10
      : null;
    const weeklyHours = ride.moving_time > 0 ? Math.round((ride.moving_time / 3600) / 4 * 10) / 10 : null;

    await upsertSportProfile('cycling', {
      weeklyKm: weeklyRideKm || null,
      avgSpeedKmh,
      ftpWatts: athlete.ftp ? Math.round(athlete.ftp) : null,
      weeklyHours,
    });
  }

  if (recentSwimKm > 0 || allSwimKm > 5) {
    const swim = stats.recent_swim_totals;
    const weeklyHours = swim.moving_time > 0 ? Math.round((swim.moving_time / 3600) / 4 * 10) / 10 : null;

    await upsertSportProfile('swimming', {
      weeklyKm: weeklySwimKm || null,
      weeklyHours,
    });
  }

  // ── 3. Import gear (bikes + shoes) from athlete profile ──
  try {
    const bikes = athlete.bikes ?? [];
    for (const bike of bikes) {
      await db.insert(stravaGear).values({
        userId,
        stravaGearId: bike.id,
        gearType: 'bike',
        name: bike.name,
        brandName: bike.brand_name ?? null,
        modelName: bike.model_name ?? null,
        distanceM: bike.distance ?? null,
        description: bike.description ?? null,
        isDefault: bike.is_primary ?? false,
      }).onConflictDoUpdate({
        target: stravaGear.stravaGearId,
        set: {
          name: bike.name,
          brandName: bike.brand_name ?? null,
          modelName: bike.model_name ?? null,
          distanceM: bike.distance ?? null,
          isDefault: bike.is_primary ?? false,
          updatedAt: new Date(),
        },
      });
    }

    const shoes = athlete.shoes ?? [];
    for (const shoe of shoes) {
      await db.insert(stravaGear).values({
        userId,
        stravaGearId: shoe.id,
        gearType: 'shoe',
        name: shoe.name,
        brandName: shoe.brand_name ?? null,
        modelName: shoe.model_name ?? null,
        distanceM: shoe.distance ?? null,
        description: shoe.description ?? null,
        isDefault: shoe.is_primary ?? false,
      }).onConflictDoUpdate({
        target: stravaGear.stravaGearId,
        set: {
          name: shoe.name,
          brandName: shoe.brand_name ?? null,
          modelName: shoe.model_name ?? null,
          distanceM: shoe.distance ?? null,
          isDefault: shoe.is_primary ?? false,
          updatedAt: new Date(),
        },
      });
    }
  } catch (err) {
    console.error('Error importing gear:', err);
  }

  // ── 4. Activities — fetch 4 pages (up to 200 activities) ──
  const allActivities: StravaActivityItem[] = [];
  for (let page = 1; page <= 4; page++) {
    try {
      const pageActivities = await fetchStravaApi<StravaActivityItem[]>(
        `https://www.strava.com/api/v3/athlete/activities?per_page=50&page=${page}`,
        accessToken
      );
      if (!pageActivities || pageActivities.length === 0) break;
      allActivities.push(...pageActivities);
      if (pageActivities.length < 50) break; // no more pages
    } catch {
      break;
    }
  }

  // ── 5. Update user lat/lon from most recent non-trainer outdoor activity ──
  const locationActivity = allActivities.find(a => !a.trainer && a.start_latlng && a.start_latlng.length === 2);
  if (locationActivity?.start_latlng) {
    await db.update(users).set({
      lat: locationActivity.start_latlng[0],
      lon: locationActivity.start_latlng[1],
    }).where(eq(users.clerkId, userId));
  }

  // ── 6. Upsert activities + collect best efforts from activity data ──
  // Track best efforts: keep only the best (fastest) per distance
  const bestEffortsMap = new Map<string, {
    distanceM: number;
    movingTimeSec: number;
    activityStravaId: string;
    startDate: Date;
  }>();

  for (const a of allActivities) {
    await db.insert(stravaActivities).values({
      userId,
      stravaId: String(a.id),
      type: a.type,
      sportType: a.sport_type || a.type,
      name: a.name,
      distanceM: a.distance,
      movingTimeSec: a.moving_time,
      elapsedTimeSec: a.elapsed_time,
      averageSpeedMs: a.average_speed,
      maxSpeedMs: a.max_speed ?? null,
      elevationGainM: a.total_elevation_gain ?? null,
      averageWatts: a.average_watts ?? null,
      weightedAvgWatts: a.weighted_average_watts ?? null,
      averageHeartrate: a.average_heartrate ?? null,
      maxHeartrate: a.max_heartrate ?? null,
      averageCadence: a.average_cadence ?? null,
      startLat: a.start_latlng?.[0] ?? null,
      startLon: a.start_latlng?.[1] ?? null,
      isTrainer: a.trainer ?? false,
      kudosCount: a.kudos_count ?? 0,
      achievementCount: a.achievement_count ?? 0,
      startDate: new Date(a.start_date),
      summaryPolyline: a.map?.summary_polyline ?? null,
    }).onConflictDoUpdate({
      target: stravaActivities.stravaId,
      set: {
        name: a.name,
        distanceM: a.distance,
        movingTimeSec: a.moving_time,
        elapsedTimeSec: a.elapsed_time,
        averageSpeedMs: a.average_speed,
        elevationGainM: a.total_elevation_gain ?? null,
        averageWatts: a.average_watts ?? null,
        averageHeartrate: a.average_heartrate ?? null,
        maxHeartrate: a.max_heartrate ?? null,
        kudosCount: a.kudos_count ?? 0,
        achievementCount: a.achievement_count ?? 0,
      },
    });

    // Process best_efforts if available (from detailed activity data)
    if (a.best_efforts && Array.isArray(a.best_efforts)) {
      for (const effort of a.best_efforts) {
        const effortName = effort.name;
        if (BEST_EFFORT_DISTANCES[effortName] !== undefined) {
          const existing = bestEffortsMap.get(effortName);
          if (!existing || effort.moving_time < existing.movingTimeSec) {
            bestEffortsMap.set(effortName, {
              distanceM: effort.distance,
              movingTimeSec: effort.moving_time,
              activityStravaId: String(a.id),
              startDate: new Date(effort.start_date || a.start_date),
            });
          }
        }
      }
    }
  }

  // ── 7. Upsert best efforts (only if better than what we have) ──
  if (bestEffortsMap.size > 0) {
    const existingEfforts = await db.select().from(stravaBestEfforts)
      .where(eq(stravaBestEfforts.userId, userId));

    for (const [effortName, effort] of bestEffortsMap.entries()) {
      const existingForName = existingEfforts.find(e => e.effortName === effortName);

      if (!existingForName) {
        await db.insert(stravaBestEfforts).values({
          userId,
          effortName,
          distanceM: effort.distanceM,
          movingTimeSec: effort.movingTimeSec,
          activityStravaId: effort.activityStravaId,
          startDate: effort.startDate,
        });
      } else if (effort.movingTimeSec < existingForName.movingTimeSec) {
        await db.update(stravaBestEfforts).set({
          distanceM: effort.distanceM,
          movingTimeSec: effort.movingTimeSec,
          activityStravaId: effort.activityStravaId,
          startDate: effort.startDate,
          updatedAt: new Date(),
        }).where(eq(stravaBestEfforts.id, existingForName.id));
      }
    }
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const isAuthMode = state === 'auth';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  if (!code) {
    return NextResponse.redirect(
      isAuthMode ? `${appUrl}/login?error=strava` : `${appUrl}/profile?strava=error`
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
      console.error('Token exchange failed:', await tokenRes.text());
      return NextResponse.redirect(
        isAuthMode ? `${appUrl}/login?error=strava` : `${appUrl}/profile?strava=error`
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
      // ── AUTH MODE: login or create account ──
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

      // Import everything from Strava
      try {
        await importStravaData(userId, athlete, accessToken);
      } catch (err) {
        console.error('Strava import error:', err);
      }

      const response = NextResponse.redirect(`${appUrl}/dashboard`);
      response.cookies.set('tt_user_id', userId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
      return response;

    } else {
      // ── CONNECT MODE: link Strava to existing user ──
      await db.insert(stravaTokens).values({
        userId: existingUserId!, stravaAthleteId, accessToken,
        refreshToken: tokenData.refresh_token, expiresAt,
      }).onConflictDoUpdate({
        target: stravaTokens.userId,
        set: { stravaAthleteId, accessToken, refreshToken: tokenData.refresh_token, expiresAt },
      });

      await db.update(users).set({
        stravaId: stravaAthleteId,
        avatarUrl: athlete.profile || athlete.profile_medium,
      }).where(eq(users.clerkId, existingUserId!));

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
