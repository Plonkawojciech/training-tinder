import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { exercises, workoutLogs } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const logId = parseInt(id);

  try {
    // Verify ownership
    const [log] = await db
      .select()
      .from(workoutLogs)
      .where(and(eq(workoutLogs.id, logId), eq(workoutLogs.userId, userId)))
      .limit(1);

    if (!log) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await request.json() as Array<{
      name: string;
      sets: number;
      repsPerSet: number[];
      weightKg: number[];
      notes?: string;
      orderIndex?: number;
    }>;

    const inserted = await db
      .insert(exercises)
      .values(
        body.map((ex, i) => ({
          workoutLogId: logId,
          name: ex.name,
          sets: ex.sets,
          repsPerSet: ex.repsPerSet,
          weightKg: ex.weightKg,
          notes: ex.notes ?? null,
          orderIndex: ex.orderIndex ?? i,
        }))
      )
      .returning();

    return NextResponse.json(inserted);
  } catch (err) {
    console.error('POST /api/workouts/[id]/exercises error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
