import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { stravaTokens, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { unauthorized, serverError } from '@/lib/api-errors';

export async function POST() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    // Remove Strava tokens
    await db.delete(stravaTokens).where(eq(stravaTokens.userId, userId));

    // Remove verified badge and Strava-related fields
    await db.update(users).set({
      stravaVerified: false,
      verifiedPacePerKm: null,
      stravaStatsJson: null,
    }).where(eq(users.authEmail, userId));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[strava/disconnect]', err);
    return serverError();
  }
}
