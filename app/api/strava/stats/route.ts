import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { users, stravaActivities, stravaGear, stravaBestEfforts } from '@/lib/db/schema';
import { eq, desc, count, gte, and, ilike, sql } from 'drizzle-orm';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  try {
  // Fetch all data in parallel
  const [
    userRows,
    gear,
    bestEfforts,
    recentActivities,
    activityCountRows,
    cycling30,
    running30,
  ] = await Promise.all([
    db.select({ stravaStatsJson: users.stravaStatsJson, ftpWatts: users.ftpWatts, city: users.city, lat: users.lat, lon: users.lon })
      .from(users).where(eq(users.clerkId, userId)),
    db.select().from(stravaGear).where(eq(stravaGear.userId, userId)).orderBy(stravaGear.gearType, desc(stravaGear.distanceM)),
    db.select().from(stravaBestEfforts).where(eq(stravaBestEfforts.userId, userId)),
    db.select().from(stravaActivities)
      .where(eq(stravaActivities.userId, userId))
      .orderBy(desc(stravaActivities.startDate))
      .limit(5),
    db.select({ count: count() }).from(stravaActivities).where(eq(stravaActivities.userId, userId)),

    // Last 30 days cycling (Ride, VirtualRide, MountainBikeRide, GravelRide, etc.)
    db.select({
      count: count(),
      totalDistanceM: sql<number>`COALESCE(SUM(${stravaActivities.distanceM}), 0)`,
      totalTimeSec: sql<number>`COALESCE(SUM(${stravaActivities.movingTimeSec}), 0)`,
      totalElevationM: sql<number>`COALESCE(SUM(${stravaActivities.elevationGainM}), 0)`,
      avgWatts: sql<number>`ROUND(AVG(NULLIF(${stravaActivities.averageWatts}, 0))::numeric, 1)`,
      avgHeartrate: sql<number>`ROUND(AVG(NULLIF(${stravaActivities.averageHeartrate}, 0))::numeric, 0)`,
      avgCadence: sql<number>`ROUND(AVG(NULLIF(${stravaActivities.averageCadence}, 0))::numeric, 0)`,
    }).from(stravaActivities)
      .where(and(
        eq(stravaActivities.userId, userId),
        gte(stravaActivities.startDate, thirtyDaysAgo),
        ilike(stravaActivities.sportType, '%ride%'),
      )),

    // Last 30 days running
    db.select({
      count: count(),
      totalDistanceM: sql<number>`COALESCE(SUM(${stravaActivities.distanceM}), 0)`,
      totalTimeSec: sql<number>`COALESCE(SUM(${stravaActivities.movingTimeSec}), 0)`,
      totalElevationM: sql<number>`COALESCE(SUM(${stravaActivities.elevationGainM}), 0)`,
    }).from(stravaActivities)
      .where(and(
        eq(stravaActivities.userId, userId),
        gte(stravaActivities.startDate, thirtyDaysAgo),
        ilike(stravaActivities.sportType, '%run%'),
      )),
  ]);

  const stats = userRows[0]?.stravaStatsJson ?? null;
  const activityCount = activityCountRows[0]?.count ?? 0;
  const ftpWatts = userRows[0]?.ftpWatts ?? null;
  const city = userRows[0]?.city ?? null;
  const lat = userRows[0]?.lat ?? null;
  const lon = userRows[0]?.lon ?? null;

  // Derive last-30-day cycling metrics
  const c = cycling30[0];
  const cyclingAvgSpeedKmh = c.totalTimeSec > 0
    ? Math.round((c.totalDistanceM / 1000) / (c.totalTimeSec / 3600) * 10) / 10
    : null;

  // Derive last-30-day running metrics
  const r = running30[0];
  const runningAvgPaceSec = r.totalDistanceM > 0
    ? Math.round(r.totalTimeSec / (r.totalDistanceM / 1000))
    : null;

  const last30 = {
    cycling: {
      count: c.count,
      totalKm: Math.round((c.totalDistanceM ?? 0) / 1000),
      totalElevationM: Math.round(c.totalElevationM ?? 0),
      avgSpeedKmh: cyclingAvgSpeedKmh,
      avgWatts: c.avgWatts ? Math.round(c.avgWatts) : null,
      avgHeartrate: c.avgHeartrate ? Math.round(c.avgHeartrate) : null,
      avgCadence: c.avgCadence ? Math.round(c.avgCadence) : null,
    },
    running: {
      count: r.count,
      totalKm: Math.round((r.totalDistanceM ?? 0) / 1000),
      totalElevationM: Math.round(r.totalElevationM ?? 0),
      avgPaceSec: runningAvgPaceSec,
    },
  };

  // Sort best efforts in a logical order
  const effortOrder = ['400m', '1k', '1 mile', '5k', '10k', '15k', 'Half-Marathon', 'Marathon'];
  const sortedBestEfforts = [...bestEfforts].sort((a, b) => {
    const aIdx = effortOrder.indexOf(a.effortName);
    const bIdx = effortOrder.indexOf(b.effortName);
    return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
  });

  return NextResponse.json({
    stats,
    gear: {
      bikes: gear.filter(g => g.gearType === 'bike'),
      shoes: gear.filter(g => g.gearType === 'shoe'),
    },
    bestEfforts: sortedBestEfforts,
    recentActivities,
    activityCount,
    last30,
    ftpWatts,
    location: { city, lat, lon },
  });
  } catch (err) {
    console.error('GET /api/strava/stats error:', err);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
