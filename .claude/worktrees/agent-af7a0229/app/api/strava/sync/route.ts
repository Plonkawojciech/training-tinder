import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { stravaTokens, stravaActivities, stravaGear, stravaBestEfforts, users, userSportProfiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

type StravaBestEffortItem = {
  name: string;
  distance: number;
  moving_time: number;
  start_date: string;
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
  trainer: boolean;
  kudos_count: number;
  achievement_count: number;
  start_date: string;
  map?: { summary_polyline?: string };
  best_efforts?: StravaBestEffortItem[];
};

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
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
    const statsRes = await fetch(
      `https://www.strava.com/api/v3/athletes/${stravaAthleteId}/stats`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (statsRes.ok) {
      const stats = await statsRes.json() as {
        recent_run_totals: { count: number; distance: number; moving_time: number };
        recent_ride_totals: { count: number; distance: number; moving_time: number };
        recent_swim_totals: { count: number; distance: number; moving_time: number };
        all_run_totals: { count: number; distance: number };
        all_ride_totals: { count: number; distance: number };
        all_swim_totals: { count: number; distance: number };
        biggest_ride_distance: number;
        biggest_climb_elevation_gain: number;
      };

      const recentRunKm = (stats.recent_run_totals?.distance ?? 0) / 1000;
      const recentRideKm = (stats.recent_ride_totals?.distance ?? 0) / 1000;
      const recentSwimKm = (stats.recent_swim_totals?.distance ?? 0) / 1000;
      const weeklyRunKm = Math.round(recentRunKm / 4);
      const weeklyRideKm = Math.round(recentRideKm / 4);
      const weeklySwimKm = Math.round(recentSwimKm / 4);
      const weeklyKm = Math.max(weeklyRunKm, weeklyRideKm, weeklySwimKm) || null;

      await db.update(users).set({
        weeklyKm,
        stravaStatsJson: stats as Record<string, unknown>,
      }).where(eq(users.clerkId, userId));

      // Update sport profiles
      const existingProfiles = await db.select().from(userSportProfiles)
        .where(eq(userSportProfiles.userId, userId));

      const upsert = async (sport: string, data: Partial<typeof userSportProfiles.$inferInsert>) => {
        const existing = existingProfiles.find(p => p.sport === sport);
        if (!existing) {
          await db.insert(userSportProfiles).values({ userId, sport, ...data });
        } else {
          await db.update(userSportProfiles).set(data).where(eq(userSportProfiles.id, existing.id));
        }
      };

      if (recentRunKm > 0) {
        const run = stats.recent_run_totals;
        const avgPaceSec = run.distance > 0 ? Math.round(run.moving_time / (run.distance / 1000)) : null;
        await upsert('running', { weeklyKm: weeklyRunKm || null, pacePerKmSec: avgPaceSec });
      }
      if (recentRideKm > 0) {
        const ride = stats.recent_ride_totals;
        const avgSpeed = ride.moving_time > 0
          ? Math.round((ride.distance / 1000) / (ride.moving_time / 3600) * 10) / 10
          : null;
        await upsert('cycling', { weeklyKm: weeklyRideKm || null, avgSpeedKmh: avgSpeed });
      }
      if (recentSwimKm > 0) {
        await upsert('swimming', { weeklyKm: weeklySwimKm || null });
      }
    }
  } catch (err) {
    console.error('Failed to sync Strava stats:', err);
  }

  // 2. Sync gear from athlete profile
  try {
    const athleteRes = await fetch(
      'https://www.strava.com/api/v3/athlete',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (athleteRes.ok) {
      const athlete = await athleteRes.json() as {
        bikes?: Array<{
          id: string;
          name: string;
          distance: number;
          brand_name?: string;
          model_name?: string;
          is_primary?: boolean;
        }>;
        shoes?: Array<{
          id: string;
          name: string;
          distance: number;
          brand_name?: string;
          model_name?: string;
          is_primary?: boolean;
        }>;
      };

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
          isDefault: bike.is_primary ?? false,
        }).onConflictDoUpdate({
          target: stravaGear.stravaGearId,
          set: {
            name: bike.name,
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
          isDefault: shoe.is_primary ?? false,
        }).onConflictDoUpdate({
          target: stravaGear.stravaGearId,
          set: {
            name: shoe.name,
            distanceM: shoe.distance ?? null,
            isDefault: shoe.is_primary ?? false,
            updatedAt: new Date(),
          },
        });
      }
    }
  } catch (err) {
    console.error('Failed to sync Strava gear:', err);
  }

  // 3. Sync activities (4 pages = up to 200 activities)
  const allActivities: StravaActivityItem[] = [];
  for (let page = 1; page <= 4; page++) {
    const activitiesRes = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?per_page=50&page=${page}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!activitiesRes.ok) break;
    const pageActivities = await activitiesRes.json() as StravaActivityItem[];
    if (!pageActivities || pageActivities.length === 0) break;
    allActivities.push(...pageActivities);
    if (pageActivities.length < 50) break;
  }

  // Update user lat/lon from most recent non-trainer activity
  const locationActivity = allActivities.find(a => !a.trainer && a.start_latlng && a.start_latlng.length === 2);
  if (locationActivity?.start_latlng) {
    await db.update(users).set({
      lat: locationActivity.start_latlng[0],
      lon: locationActivity.start_latlng[1],
    }).where(eq(users.clerkId, userId));
  }

  // Upsert activities + collect best efforts
  const bestEffortsMap = new Map<string, {
    distanceM: number;
    movingTimeSec: number;
    activityStravaId: string;
    startDate: Date;
  }>();

  let synced = 0;
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
        elevationGainM: a.total_elevation_gain ?? null,
        averageWatts: a.average_watts ?? null,
        averageHeartrate: a.average_heartrate ?? null,
        kudosCount: a.kudos_count ?? 0,
      },
    });
    synced++;

    // Extract best efforts if present
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

  // Upsert best efforts
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

  return NextResponse.json({ synced, pagesChecked: Math.ceil(synced / 50) + 1 });
}
