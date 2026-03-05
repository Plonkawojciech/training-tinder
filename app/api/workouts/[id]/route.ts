import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { workoutLogs, exercises } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const logId = parseInt(id);

  try {
    const [log] = await db
      .select()
      .from(workoutLogs)
      .where(eq(workoutLogs.id, logId))
      .limit(1);

    if (!log) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (log.userId !== userId && !log.isPublic) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const exs = await db
      .select()
      .from(exercises)
      .where(eq(exercises.workoutLogId, logId));

    return NextResponse.json({ ...log, exercises: exs });
  } catch (err) {
    console.error('GET /api/workouts/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const logId = parseInt(id);

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

    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    console.error('PUT /api/workouts/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const logId = parseInt(id);

  try {
    await db.delete(exercises).where(eq(exercises.workoutLogId, logId));
    const [deleted] = await db
      .delete(workoutLogs)
      .where(and(eq(workoutLogs.id, logId), eq(workoutLogs.userId, userId)))
      .returning();

    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/workouts/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
