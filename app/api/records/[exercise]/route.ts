import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { personalRecords } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { unauthorized, serverError, badRequest, ErrorCode } from '@/lib/api-errors';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ exercise: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { exercise } = await params;
  let exerciseName: string;
  try {
    exerciseName = decodeURIComponent(exercise);
  } catch {
    return badRequest(ErrorCode.INVALID_INPUT, 'Invalid exercise name encoding');
  }

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
    return serverError();
  }
}
