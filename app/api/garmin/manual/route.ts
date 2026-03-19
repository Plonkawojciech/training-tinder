import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { userSportProfiles } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { unauthorized, serverError, badRequest, ErrorCode } from '@/lib/api-errors';

interface ManualGarminStats {
  weeklyKm?: number;
  vo2max?: number;
  ftpWatts?: number;
  avgPaceKmh?: number;
  sport: string;
}

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  let body: ManualGarminStats;
  try {
    body = await request.json() as ManualGarminStats;
  } catch {
    return badRequest(ErrorCode.INVALID_INPUT, 'Invalid request body');
  }

  const { weeklyKm, vo2max, ftpWatts, avgPaceKmh, sport } = body;

  if (!sport) {
    return badRequest(ErrorCode.MISSING_FIELDS, 'Sport is required');
  }

  try {
    const existing = await db
      .select()
      .from(userSportProfiles)
      .where(and(eq(userSportProfiles.userId, userId), eq(userSportProfiles.sport, sport)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(userSportProfiles)
        .set({
          ...(weeklyKm !== undefined && { weeklyKm }),
          ...(vo2max !== undefined && { vo2max }),
          ...(ftpWatts !== undefined && { ftpWatts }),
          ...(avgPaceKmh !== undefined && { avgSpeedKmh: avgPaceKmh }),
          updatedAt: new Date(),
        })
        .where(and(eq(userSportProfiles.userId, userId), eq(userSportProfiles.sport, sport)));

      return NextResponse.json({ success: true, updated: true });
    }

    const [profile] = await db
      .insert(userSportProfiles)
      .values({
        userId,
        sport,
        level: 'recreational',
        weeklyKm: weeklyKm ?? undefined,
        vo2max: vo2max ?? undefined,
        ftpWatts: ftpWatts ?? undefined,
        avgSpeedKmh: avgPaceKmh ?? undefined,
      })
      .returning();

    return NextResponse.json({ success: true, profile });
  } catch (err) {
    console.error('POST /api/garmin/manual error:', err);
    return serverError();
  }
}
