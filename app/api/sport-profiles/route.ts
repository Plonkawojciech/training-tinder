import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { userSportProfiles } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { unauthorized, serverError, badRequest, ErrorCode } from '@/lib/api-errors';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const profiles = await db
      .select()
      .from(userSportProfiles)
      .where(eq(userSportProfiles.userId, userId));
    return NextResponse.json(profiles);
  } catch (err) {
    console.error('GET /api/sport-profiles error:', err);
    return serverError();
  }
}

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const body = await request.json() as {
      sport: string;
      level?: string;
      avgSpeedKmh?: number;
      pacePerKmSec?: number;
      ftpWatts?: number;
      vo2max?: number;
      weeklyKm?: number;
      weeklyHours?: number;
      restingHr?: number;
      maxHr?: number;
      big4Json?: { bench?: number; squat?: number; deadlift?: number; ohp?: number };
      primaryGoal?: string;
      yearsExperience?: number;
    };

    if (!body.sport) {
      return badRequest(ErrorCode.MISSING_FIELDS, 'Sport is required');
    }

    const existing = await db
      .select()
      .from(userSportProfiles)
      .where(and(eq(userSportProfiles.userId, userId), eq(userSportProfiles.sport, body.sport)))
      .limit(1);

    const values = {
      userId,
      sport: body.sport,
      level: body.level ?? 'recreational',
      avgSpeedKmh: body.avgSpeedKmh ?? null,
      pacePerKmSec: body.pacePerKmSec ?? null,
      ftpWatts: body.ftpWatts ?? null,
      vo2max: body.vo2max ?? null,
      weeklyKm: body.weeklyKm ?? null,
      weeklyHours: body.weeklyHours ?? null,
      restingHr: body.restingHr ?? null,
      maxHr: body.maxHr ?? null,
      big4Json: body.big4Json ?? {},
      primaryGoal: body.primaryGoal ?? null,
      yearsExperience: body.yearsExperience ?? null,
      updatedAt: new Date(),
    };

    if (existing.length === 0) {
      const [created] = await db.insert(userSportProfiles).values(values).returning();
      return NextResponse.json(created);
    } else {
      const [updated] = await db
        .update(userSportProfiles)
        .set(values)
        .where(and(eq(userSportProfiles.userId, userId), eq(userSportProfiles.sport, body.sport)))
        .returning();
      return NextResponse.json(updated);
    }
  } catch (err) {
    console.error('POST /api/sport-profiles error:', err);
    return serverError();
  }
}
