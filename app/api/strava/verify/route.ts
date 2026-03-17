import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { stravaActivities, users } from '@/lib/db/schema';
import { and, eq, gte } from 'drizzle-orm';

export async function POST() {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });
  }

  try {
  // Get user's claimed pace
  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, userId));

  if (userRows.length === 0) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const user = userRows[0];
  const claimedPace = user.pacePerKm; // seconds per km

  // Get running activities from the last 90 days
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const runs = await db
    .select()
    .from(stravaActivities)
    .where(
      and(
        eq(stravaActivities.userId, userId),
        eq(stravaActivities.type, 'Run'),
        gte(stravaActivities.startDate, since)
      )
    );

  if (runs.length === 0) {
    return NextResponse.json({
      verified: false,
      claimedPace,
      actualPace: null,
      diff: null,
      message: 'No running activities found in the last 90 days',
    });
  }

  // Calculate average speed across all runs (weighted by activity count)
  const validRuns = runs.filter((r) => r.averageSpeedMs && r.averageSpeedMs > 0);

  if (validRuns.length === 0) {
    return NextResponse.json({
      verified: false,
      claimedPace,
      actualPace: null,
      diff: null,
      message: 'No valid running data found',
    });
  }

  const avgSpeedMs =
    validRuns.reduce((sum, r) => sum + (r.averageSpeedMs ?? 0), 0) / validRuns.length;

  // Convert m/s to sec/km: pacePerKmSec = 1000 / avgSpeedMs
  const actualPace = Math.round(1000 / avgSpeedMs);

  let verified = false;
  let message = '';

  if (claimedPace === null || claimedPace === undefined) {
    // No claimed pace set — just store actual pace
    verified = true;
    message = 'No claimed pace to compare against — storing actual pace';
  } else {
    const diff = Math.abs(actualPace - claimedPace);

    if (diff < 30) {
      verified = true;
      message = 'Pace verified';
    } else if (diff <= 90) {
      verified = true;
      message = 'Pace close to claimed — verified with note';
    } else {
      verified = false;
      message = 'Pace differs too much from claimed';
    }

    // Save result to users table
    await db
      .update(users)
      .set({ stravaVerified: verified, verifiedPacePerKm: actualPace })
      .where(eq(users.clerkId, userId));

    return NextResponse.json({
      verified,
      claimedPace,
      actualPace,
      diff,
      message,
      runCount: validRuns.length,
    });
  }

  // No claimed pace case — still save actual
  await db
    .update(users)
    .set({ stravaVerified: verified, verifiedPacePerKm: actualPace })
    .where(eq(users.clerkId, userId));

  return NextResponse.json({
    verified,
    claimedPace,
    actualPace,
    diff: null,
    message,
    runCount: validRuns.length,
  });
  } catch (err) {
    console.error('POST /api/strava/verify error:', err);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
