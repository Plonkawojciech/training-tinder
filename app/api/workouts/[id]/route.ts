import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { workoutLogs, exercises } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

  const { id } = await params;
  const logId = parseInt(id);
  if (isNaN(logId)) return NextResponse.json({ error: 'Invalid workout id' }, { status: 400 });

  try {
    const [log] = await db
      .select()
      .from(workoutLogs)
      .where(eq(workoutLogs.id, logId))
      .limit(1);

    if (!log) return NextResponse.json({ error: 'Nie znaleziono' }, { status: 404 });
    if (log.userId !== userId && !log.isPublic) {
      return NextResponse.json({ error: 'Brak dostępu' }, { status: 403 });
    }

    const exs = await db
      .select()
      .from(exercises)
      .where(eq(exercises.workoutLogId, logId));

    return NextResponse.json({ ...log, exercises: exs });
  } catch (err) {
    console.error('GET /api/workouts/[id] error:', err);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

  const { id } = await params;
  const logId = parseInt(id);
  if (isNaN(logId)) return NextResponse.json({ error: 'Invalid workout id' }, { status: 400 });

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

    if (!updated) return NextResponse.json({ error: 'Nie znaleziono' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    console.error('PUT /api/workouts/[id] error:', err);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

  const { id } = await params;
  const logId = parseInt(id);
  if (isNaN(logId)) return NextResponse.json({ error: 'Invalid workout id' }, { status: 400 });

  try {
    // Verify ownership before touching any data
    const [log] = await db
      .select({ id: workoutLogs.id })
      .from(workoutLogs)
      .where(and(eq(workoutLogs.id, logId), eq(workoutLogs.userId, userId)))
      .limit(1);

    if (!log) return NextResponse.json({ error: 'Nie znaleziono' }, { status: 404 });

    await db.delete(exercises).where(eq(exercises.workoutLogId, logId));
    await db.delete(workoutLogs).where(eq(workoutLogs.id, logId));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/workouts/[id] error:', err);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
