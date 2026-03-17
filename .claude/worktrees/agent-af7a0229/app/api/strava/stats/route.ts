import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { users, stravaActivities, stravaGear, stravaBestEfforts } from '@/lib/db/schema';
import { eq, desc, count } from 'drizzle-orm';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Fetch all data in parallel
  const [userRows, gear, bestEfforts, recentActivities, activityCountRows] = await Promise.all([
    db.select({ stravaStatsJson: users.stravaStatsJson }).from(users).where(eq(users.clerkId, userId)),
    db.select().from(stravaGear).where(eq(stravaGear.userId, userId)).orderBy(stravaGear.gearType, desc(stravaGear.distanceM)),
    db.select().from(stravaBestEfforts).where(eq(stravaBestEfforts.userId, userId)),
    db.select().from(stravaActivities)
      .where(eq(stravaActivities.userId, userId))
      .orderBy(desc(stravaActivities.startDate))
      .limit(5),
    db.select({ count: count() }).from(stravaActivities).where(eq(stravaActivities.userId, userId)),
  ]);

  const stats = userRows[0]?.stravaStatsJson ?? null;
  const activityCount = activityCountRows[0]?.count ?? 0;

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
  });
}
