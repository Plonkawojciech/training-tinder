import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { workoutLogs, exercises, users, activityFeed } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const mine = searchParams.get('mine') === 'true';
  const limit = parseInt(searchParams.get('limit') ?? '20');

  try {
    let rows: typeof workoutLogs.$inferSelect[];
    if (mine) {
      rows = await db
        .select()
        .from(workoutLogs)
        .where(eq(workoutLogs.userId, userId))
        .orderBy(desc(workoutLogs.createdAt))
        .limit(limit);
    } else {
      rows = await db
        .select()
        .from(workoutLogs)
        .where(eq(workoutLogs.isPublic, true))
        .orderBy(desc(workoutLogs.createdAt))
        .limit(limit);
    }

    const enriched = await Promise.all(
      rows.map(async (log) => {
        const exs = await db
          .select()
          .from(exercises)
          .where(eq(exercises.workoutLogId, log.id));

        const creator = await db
          .select({ username: users.username, avatarUrl: users.avatarUrl })
          .from(users)
          .where(eq(users.clerkId, log.userId))
          .limit(1);

        return {
          ...log,
          exercises: exs,
          creator: creator[0] ?? null,
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (err) {
    console.error('GET /api/workouts error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json() as {
      date: string;
      type: string;
      name: string;
      durationMin?: number;
      notes?: string;
      isPublic?: boolean;
      exercises?: Array<{
        name: string;
        sets: number;
        repsPerSet: number[];
        weightKg: number[];
        notes?: string;
        orderIndex?: number;
      }>;
    };

    const [log] = await db
      .insert(workoutLogs)
      .values({
        userId,
        date: body.date,
        type: body.type,
        name: body.name,
        durationMin: body.durationMin ?? null,
        notes: body.notes ?? null,
        isPublic: body.isPublic ?? false,
      })
      .returning();

    if (body.exercises && body.exercises.length > 0) {
      await db.insert(exercises).values(
        body.exercises.map((ex, i) => ({
          workoutLogId: log.id,
          name: ex.name,
          sets: ex.sets,
          repsPerSet: ex.repsPerSet,
          weightKg: ex.weightKg,
          notes: ex.notes ?? null,
          orderIndex: ex.orderIndex ?? i,
        }))
      );
    }

    // Add to activity feed
    if (body.isPublic) {
      await db.insert(activityFeed).values({
        userId,
        type: 'workout_completed',
        dataJson: {
          workoutId: log.id,
          workoutName: log.name,
          type: log.type,
          durationMin: log.durationMin,
          exerciseCount: body.exercises?.length ?? 0,
        },
      });
    }

    return NextResponse.json(log);
  } catch (err) {
    console.error('POST /api/workouts error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
