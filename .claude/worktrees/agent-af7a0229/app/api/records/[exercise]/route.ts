import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { personalRecords } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ exercise: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { exercise } = await params;
  const exerciseName = decodeURIComponent(exercise);

  try {
    const rows = await db
      .select()
      .from(personalRecords)
      .where(
        and(
          eq(personalRecords.userId, userId),
          eq(personalRecords.exerciseName, exerciseName)
        )
      )
      .orderBy(desc(personalRecords.achievedAt));

    return NextResponse.json(rows);
  } catch (err) {
    console.error('GET /api/records/[exercise] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
