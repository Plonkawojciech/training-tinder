import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { stravaTokens, stravaActivities, users } from '@/lib/db/schema';
import { eq, count } from 'drizzle-orm';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tokenRows = await db
    .select()
    .from(stravaTokens)
    .where(eq(stravaTokens.userId, userId));

  const connected = tokenRows.length > 0;

  const activityCountRows = await db
    .select({ total: count() })
    .from(stravaActivities)
    .where(eq(stravaActivities.userId, userId));

  const activityCount = activityCountRows[0]?.total ?? 0;

  const userRows = await db
    .select({
      stravaVerified: users.stravaVerified,
      verifiedPacePerKm: users.verifiedPacePerKm,
    })
    .from(users)
    .where(eq(users.clerkId, userId));

  const userInfo = userRows[0] ?? { stravaVerified: false, verifiedPacePerKm: null };

  return NextResponse.json({
    connected,
    activityCount,
    stravaVerified: userInfo.stravaVerified,
    verifiedPacePerKm: userInfo.verifiedPacePerKm,
  });
}
