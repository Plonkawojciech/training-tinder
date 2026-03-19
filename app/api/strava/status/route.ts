import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { stravaTokens, stravaActivities, users } from '@/lib/db/schema';
import { eq, count } from 'drizzle-orm';
import { unauthorized, serverError } from '@/lib/api-errors';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return unauthorized();
  }

  try {
    const [tokenRows, activityCountRows, userRows] = await Promise.all([
      db.select().from(stravaTokens).where(eq(stravaTokens.userId, userId)),
      db.select({ total: count() }).from(stravaActivities).where(eq(stravaActivities.userId, userId)),
      db.select({ stravaVerified: users.stravaVerified, verifiedPacePerKm: users.verifiedPacePerKm })
        .from(users).where(eq(users.authEmail, userId)),
    ]);

    const connected = tokenRows.length > 0;
    const activityCount = activityCountRows[0]?.total ?? 0;
    const userInfo = userRows[0] ?? { stravaVerified: false, verifiedPacePerKm: null };

    return NextResponse.json({
      connected,
      activityCount,
      stravaVerified: userInfo.stravaVerified,
      verifiedPacePerKm: userInfo.verifiedPacePerKm,
    });
  } catch (err) {
    console.error('GET /api/strava/status error:', err);
    return serverError();
  }
}
