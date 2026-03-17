import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { personalRecords, activityFeed } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const exercise = searchParams.get('exercise');

  try {
    let rows: typeof personalRecords.$inferSelect[];
    if (exercise) {
      rows = await db
        .select()
        .from(personalRecords)
        .where(eq(personalRecords.userId, userId))
        .orderBy(desc(personalRecords.achievedAt));
      rows = rows.filter((r) => r.exerciseName.toLowerCase() === exercise.toLowerCase());
    } else {
      rows = await db
        .select()
        .from(personalRecords)
        .where(eq(personalRecords.userId, userId))
        .orderBy(desc(personalRecords.achievedAt));
    }

    // Get best per exercise
    const bestPerExercise: Record<string, typeof personalRecords.$inferSelect> = {};
    for (const row of rows) {
      const existing = bestPerExercise[row.exerciseName];
      if (!existing || row.weightKg > existing.weightKg) {
        bestPerExercise[row.exerciseName] = row;
      }
    }

    return NextResponse.json({
      all: rows,
      best: Object.values(bestPerExercise),
    });
  } catch (err) {
    console.error('GET /api/records error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json() as {
      exerciseName: string;
      weightKg: number;
      reps: number;
      notes?: string;
    };

    const [pr] = await db
      .insert(personalRecords)
      .values({
        userId,
        exerciseName: body.exerciseName,
        weightKg: body.weightKg,
        reps: body.reps,
        notes: body.notes ?? null,
      })
      .returning();

    // Add to activity feed
    await db.insert(activityFeed).values({
      userId,
      type: 'pr_set',
      dataJson: {
        prId: pr.id,
        exerciseName: pr.exerciseName,
        weightKg: pr.weightKg,
        reps: pr.reps,
      },
    });

    return NextResponse.json(pr);
  } catch (err) {
    console.error('POST /api/records error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
