/**
 * Shared Strava integration utilities used by both callback and sync routes.
 */
import { db } from '@/lib/db';
import { stravaActivities, stravaGear, stravaBestEfforts, users, userSportProfiles } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

// ── Shared types ──

export type StravaAthlete = {
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

export type StravaTotals = {
  count: number;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  elevation_gain: number;
  achievement_count?: number;
};

export type StravaStats = {
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

export type StravaBestEffortItem = {
  name: string;
  distance: number;
  moving_time: number;
  start_date: string;
  activity?: { id: number };
};

export type StravaActivityItem = {
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

// ── Constants ──

/** Known best effort distances in meters */
export const BEST_EFFORT_DISTANCES: Record<string, number> = {
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

// ── API helper ──

export async function fetchStravaApi<T>(url: string, accessToken: string): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Strava API ${url} returned ${res.status}`);
  return res.json() as Promise<T>;
}

// ── Shared functions ──

/** Upsert a single sport profile (create if new, update if exists) */
async function upsertSportProfile(
  userId: string,
  existingProfiles: (typeof userSportProfiles.$inferSelect)[],
  sport: string,
  data: Partial<typeof userSportProfiles.$inferInsert>,
) {
  const existing = existingProfiles.find(p => p.sport === sport);
  if (!existing) {
    await db.insert(userSportProfiles).values({ userId, sport, ...data });
  } else {
    await db.update(userSportProfiles).set(data).where(eq(userSportProfiles.id, existing.id));
  }
}

/** Update user sport profiles from Strava stats */
export async function updateSportProfiles(
  userId: string,
  stats: {
    recent_run_totals: { count: number; distance: number; moving_time: number };
    recent_ride_totals: { count: number; distance: number; moving_time: number };
    recent_swim_totals: { count: number; distance: number; moving_time: number };
    all_run_totals?: { count: number; distance: number };
    all_ride_totals?: { count: number; distance: number };
    all_swim_totals?: { count: number; distance: number };
  },
  opts?: { ftp?: number },
) {
  const recentRunKm = (stats.recent_run_totals?.distance ?? 0) / 1000;
  const recentRideKm = (stats.recent_ride_totals?.distance ?? 0) / 1000;
  const recentSwimKm = (stats.recent_swim_totals?.distance ?? 0) / 1000;
  const allRunKm = (stats.all_run_totals?.distance ?? 0) / 1000;
  const allRideKm = (stats.all_ride_totals?.distance ?? 0) / 1000;
  const allSwimKm = (stats.all_swim_totals?.distance ?? 0) / 1000;
  const weeklyRunKm = Math.round(recentRunKm / 4);
  const weeklyRideKm = Math.round(recentRideKm / 4);
  const weeklySwimKm = Math.round(recentSwimKm / 4);
  const weeklyKm = Math.max(weeklyRunKm, weeklyRideKm, weeklySwimKm) || null;

  const existingProfiles = await db.select().from(userSportProfiles)
    .where(eq(userSportProfiles.userId, userId));

  if (recentRunKm > 0 || allRunKm > 5) {
    const run = stats.recent_run_totals;
    const avgPaceSec = (run.count > 0 && run.distance > 0)
      ? Math.round(run.moving_time / (run.distance / 1000))
      : null;
    const weeklyHours = run.moving_time > 0 ? Math.round((run.moving_time / 3600) / 4 * 10) / 10 : null;
    await upsertSportProfile(userId, existingProfiles, 'running', {
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
    await upsertSportProfile(userId, existingProfiles, 'cycling', {
      weeklyKm: weeklyRideKm || null,
      avgSpeedKmh,
      ftpWatts: opts?.ftp ? Math.round(opts.ftp) : null,
      weeklyHours,
    });
  }

  if (recentSwimKm > 0 || allSwimKm > 5) {
    const swim = stats.recent_swim_totals;
    const weeklyHours = swim.moving_time > 0 ? Math.round((swim.moving_time / 3600) / 4 * 10) / 10 : null;
    await upsertSportProfile(userId, existingProfiles, 'swimming', {
      weeklyKm: weeklySwimKm || null,
      weeklyHours,
    });
  }

  return {
    detectedSports: [
      ...(recentRunKm > 0 || allRunKm > 5 ? ['running'] : []),
      ...(recentRideKm > 0 || allRideKm > 20 ? ['cycling'] : []),
      ...(recentSwimKm > 0 || allSwimKm > 5 ? ['swimming'] : []),
    ],
    weeklyKm,
    weeklyRunKm,
    weeklyRideKm,
    weeklySwimKm,
  };
}

/** Import gear (bikes + shoes) from a Strava athlete profile */
export async function importStravaGear(
  userId: string,
  athlete: Pick<StravaAthlete, 'bikes' | 'shoes'>,
) {
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
}

/** Fetch activity pages from Strava (up to maxPages * 50 activities) */
export async function fetchStravaActivities(
  accessToken: string,
  maxPages = 4,
): Promise<StravaActivityItem[]> {
  const allActivities: StravaActivityItem[] = [];
  for (let page = 1; page <= maxPages; page++) {
    try {
      const pageActivities = await fetchStravaApi<StravaActivityItem[]>(
        `https://www.strava.com/api/v3/athlete/activities?per_page=50&page=${page}`,
        accessToken,
      );
      if (!pageActivities || pageActivities.length === 0) break;
      allActivities.push(...pageActivities);
      if (pageActivities.length < 50) break;
    } catch {
      break;
    }
  }
  return allActivities;
}

/** Update user lat/lon from the most recent non-trainer outdoor activity */
export async function updateUserLocation(userId: string, activities: StravaActivityItem[]) {
  const locationActivity = activities.find(a => !a.trainer && a.start_latlng && a.start_latlng.length === 2);
  if (locationActivity?.start_latlng) {
    await db.update(users).set({
      lat: locationActivity.start_latlng[0],
      lon: locationActivity.start_latlng[1],
    }).where(eq(users.clerkId, userId));
  }
}

/** Upsert activities and collect best efforts. Returns the best efforts map and synced count. */
export async function upsertActivitiesAndCollectBestEfforts(
  userId: string,
  activities: StravaActivityItem[],
): Promise<{
  synced: number;
  bestEffortsMap: Map<string, { distanceM: number; movingTimeSec: number; activityStravaId: string; startDate: Date }>;
}> {
  const bestEffortsMap = new Map<string, {
    distanceM: number;
    movingTimeSec: number;
    activityStravaId: string;
    startDate: Date;
  }>();

  if (activities.length === 0) return { synced: 0, bestEffortsMap };

  // Build all rows for batch insert
  const rows = activities.map((a) => ({
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
  }));

  // Batch upsert — single INSERT ... ON CONFLICT DO UPDATE for all activities
  // Process in chunks of 50 to stay within Postgres parameter limits
  const CHUNK_SIZE = 50;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    await db.insert(stravaActivities).values(chunk).onConflictDoUpdate({
      target: stravaActivities.stravaId,
      set: {
        name: sql`excluded.name`,
        distanceM: sql`excluded.distance_m`,
        movingTimeSec: sql`excluded.moving_time_sec`,
        elapsedTimeSec: sql`excluded.elapsed_time_sec`,
        averageSpeedMs: sql`excluded.average_speed_ms`,
        elevationGainM: sql`excluded.elevation_gain_m`,
        averageWatts: sql`excluded.average_watts`,
        averageHeartrate: sql`excluded.average_heartrate`,
        maxHeartrate: sql`excluded.max_heartrate`,
        kudosCount: sql`excluded.kudos_count`,
        achievementCount: sql`excluded.achievement_count`,
      },
    });
  }

  // Collect best efforts from activity data (no DB call needed)
  for (const a of activities) {
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

  return { synced: activities.length, bestEffortsMap };
}

/** Upsert best efforts — only save if better (faster) than existing records */
export async function upsertBestEfforts(
  userId: string,
  bestEffortsMap: Map<string, { distanceM: number; movingTimeSec: number; activityStravaId: string; startDate: Date }>,
) {
  if (bestEffortsMap.size === 0) return;

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
