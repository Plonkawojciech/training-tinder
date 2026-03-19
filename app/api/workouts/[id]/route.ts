import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { workoutLogs, exercises } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { unauthorized, forbidden, notFound, serverError, badRequest, ErrorCode } from '@/lib/api-errors';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const logId = parseInt(id);
  if (isNaN(logId)) return badRequest(ErrorCode.INVALID_INPUT, 'Invalid workout id');

  try {
    const [log] = await db
      .select()
      .from(workoutLogs)
      .where(eq(workoutLogs.id, logId))
      .limit(1);

    if (!log) return notFound();
    if (log.userId !== userId && !log.isPublic) {
      return forbidden();
    }

    const exs = await db
      .select()
      .from(exercises)
      .where(eq(exercises.workoutLogId, logId));

    return NextResponse.json({ ...log, exercises: exs });
  } catch (err) {
    console.error('GET /api/workouts/[id] error:', err);
    return serverError();
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const logId = parseInt(id);
  if (isNaN(logId)) return badRequest(ErrorCode.INVALID_INPUT, 'Invalid workout id');

  try {
    const body = await request.json() as Partial<{
      name: string;
      type: string;
      durationMin: number;
      notes: string;
      isPublic: boolean;
    }>;

    const [updated] = await db
      .update(workoutLogs)
      .set(body)
      .where(and(eq(workoutLogs.id, logId), eq(workoutLogs.userId, userId)))
      .returning();

    if (!updated) return notFound();
    return NextResponse.json(updated);
  } catch (err) {
    console.error('PUT /api/workouts/[id] error:', err);
    return serverError();
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const logId = parseInt(id);
  if (isNaN(logId)) return badRequest(ErrorCode.INVALID_INPUT, 'Invalid workout id');

  try {
    // Verify ownership before touching any data
    const [log] = await db
      .select({ id: workoutLogs.id })
      .from(workoutLogs)
      .where(and(eq(workoutLogs.id, logId), eq(workoutLogs.userId, userId)))
      .limit(1);

    if (!log) return notFound();

    await db.delete(exercises).where(eq(exercises.workoutLogId, logId));
    await db.delete(workoutLogs).where(eq(workoutLogs.id, logId));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/workouts/[id] error:', err);
    return serverError();
  }
}
