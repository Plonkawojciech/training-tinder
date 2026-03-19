import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { workoutLogs, exercises, users, activityFeed } from '@/lib/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import { unauthorized, serverError, badRequest, ErrorCode } from '@/lib/api-errors';

export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { searchParams } = new URL(request.url);
  const mine = searchParams.get('mine') === 'true';
  const limit = Math.max(1, parseInt(searchParams.get('limit') ?? '20') || 20);

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

    const logIds = rows.map((r) => r.id);
    const userIds = [...new Set(rows.map((r) => r.userId))];

    const [allExercises, allCreators] = await Promise.all([
      logIds.length > 0
        ? db.select().from(exercises).where(inArray(exercises.workoutLogId, logIds))
        : Promise.resolve([]),
      userIds.length > 0
        ? db.select({ authEmail: users.authEmail, username: users.username, avatarUrl: users.avatarUrl })
            .from(users).where(inArray(users.authEmail, userIds))
        : Promise.resolve([]),
    ]);

    type ExerciseRow = (typeof allExercises)[0];
    const exMap: Record<number, ExerciseRow[]> = {};
    for (const ex of allExercises) {
      (exMap[ex.workoutLogId] ??= []).push(ex);
    }
    const creatorMap = Object.fromEntries(allCreators.map((u) => [u.authEmail, u]));

    const enriched = rows.map((log) => ({
      ...log,
      exercises: exMap[log.id] ?? [],
      creator: creatorMap[log.userId] ?? null,
    }));

    return NextResponse.json(enriched);
  } catch (err) {
    console.error('GET /api/workouts error:', err);
    return serverError();
  }
}

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const body = await request.json() as {
      date?: unknown;
      type?: unknown;
      name?: unknown;
      durationMin?: unknown;
      notes?: unknown;
      isPublic?: unknown;
      exercises?: unknown;
    };

    if (typeof body.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
      return badRequest(ErrorCode.INVALID_DATE, 'Invalid date format (YYYY-MM-DD)');
    }
    if (typeof body.type !== 'string' || !body.type.trim()) {
      return badRequest(ErrorCode.MISSING_FIELDS, 'Workout type is required');
    }
    if (typeof body.name !== 'string' || body.name.trim().length < 1) {
      return badRequest(ErrorCode.MISSING_FIELDS, 'Workout name is required');
    }
    if (body.name.trim().length > 120) {
      return badRequest(ErrorCode.CONTENT_TOO_LONG, 'Name must be at most 120 characters');
    }

    const durationMin = body.durationMin !== undefined ? Number(body.durationMin) : null;
    if (durationMin !== null && (isNaN(durationMin) || durationMin < 0 || durationMin > 1440)) {
      return badRequest(ErrorCode.INVALID_INPUT, 'Duration must be between 0 and 1440 minutes');
    }

    const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 2000) : null;
    const isPublic = body.isPublic === true;

    // Validate exercises array (max 100)
    const rawExercises = Array.isArray(body.exercises) ? (body.exercises as unknown[]).slice(0, 100) : [];

    const [log] = await db
      .insert(workoutLogs)
      .values({
        userId,
        date: body.date,
        type: body.type.trim(),
        name: body.name.trim(),
        durationMin,
        notes,
        isPublic,
      })
      .returning();

    if (rawExercises.length > 0) {
      await db.insert(exercises).values(
        rawExercises.map((ex, i) => {
          const e = ex as Record<string, unknown>;
          const sets = Math.min(100, Math.max(1, Number(e.sets) || 1));
          const repsPerSet = Array.isArray(e.repsPerSet) ? (e.repsPerSet as unknown[]).slice(0, 100).map(Number) : [];
          const weightKg = Array.isArray(e.weightKg) ? (e.weightKg as unknown[]).slice(0, 100).map(Number) : [];
          return {
            workoutLogId: log.id,
            name: typeof e.name === 'string' ? e.name.trim().slice(0, 100) : 'Exercise',
            sets,
            repsPerSet,
            weightKg,
            notes: typeof e.notes === 'string' ? e.notes.trim().slice(0, 500) : null,
            orderIndex: typeof e.orderIndex === 'number' ? e.orderIndex : i,
          };
        })
      );
    }

    // Add to activity feed
    if (isPublic) {
      await db.insert(activityFeed).values({
        userId,
        type: 'workout_completed',
        dataJson: {
          workoutId: log.id,
          workoutName: log.name,
          type: log.type,
          durationMin: log.durationMin,
          exerciseCount: rawExercises.length,
        },
      });
    }

    return NextResponse.json(log);
  } catch (err) {
    console.error('POST /api/workouts error:', err);
    return serverError();
  }
}
