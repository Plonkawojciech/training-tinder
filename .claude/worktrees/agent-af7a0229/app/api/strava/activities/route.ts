import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { stravaActivities } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type'); // optional filter: 'Run', 'Ride', 'Swim', etc.
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50);
  const offset = parseInt(searchParams.get('offset') ?? '0');

  const results = await db
    .select()
    .from(stravaActivities)
    .where(
      type
        ? and(eq(stravaActivities.userId, userId), eq(stravaActivities.sportType, type))
        : eq(stravaActivities.userId, userId)
    )
    .orderBy(desc(stravaActivities.startDate))
    .limit(limit)
    .offset(offset);

  return NextResponse.json(results);
}
