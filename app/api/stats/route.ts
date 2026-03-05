import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { userStats, workoutLogs, personalRecords, exercises } from '@/lib/db/schema';
import { eq, desc, and, gte } from 'drizzle-orm';

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') ?? 'body';

  try {
    if (type === 'body') {
      const stats = await db
        .select()
        .from(userStats)
        .where(eq(userStats.userId, userId))
        .orderBy(desc(userStats.date))
        .limit(90);
      return NextResponse.json(stats);
    }

    if (type === 'summary') {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const allWorkouts = await db
        .select()
        .from(workoutLogs)
        .where(eq(workoutLogs.userId, userId));

      const weekWorkouts = allWorkouts.filter(
        (w) => new Date(w.date) >= weekAgo
      );
      const monthWorkouts = allWorkouts.filter(
        (w) => new Date(w.date) >= monthAgo
      );

      const allPRs = await db
        .select()
        .from(personalRecords)
        .where(eq(personalRecords.userId, userId));

      const monthPRs = allPRs.filter(
        (p) => new Date(p.achievedAt) >= monthAgo
      );

      // Total sets this month
      let totalSets = 0;
      for (const workout of monthWorkouts) {
        const exs = await db
          .select({ sets: exercises.sets })
          .from(exercises)
          .where(eq(exercises.workoutLogId, workout.id));
        totalSets += exs.reduce((sum, e) => sum + e.sets, 0);
      }

      return NextResponse.json({
        totalWorkouts: allWorkouts.length,
        weekWorkouts: weekWorkouts.length,
        monthWorkouts: monthWorkouts.length,
        monthPRs: monthPRs.length,
        totalSets,
        totalPRs: allPRs.length,
      });
    }

    if (type === 'heatmap') {
      const yearAgo = new Date();
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);

      const workouts = await db
        .select({ date: workoutLogs.date })
        .from(workoutLogs)
        .where(eq(workoutLogs.userId, userId));

      const countByDate: Record<string, number> = {};
      for (const w of workouts) {
        const dateStr = w.date;
        countByDate[dateStr] = (countByDate[dateStr] ?? 0) + 1;
      }

      return NextResponse.json(countByDate);
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
  } catch (err) {
    console.error('GET /api/stats error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json() as {
      date: string;
      weightKg?: number;
      bodyFatPct?: number;
      notes?: string;
    };

    const [stat] = await db
      .insert(userStats)
      .values({
        userId,
        date: body.date,
        weightKg: body.weightKg ?? null,
        bodyFatPct: body.bodyFatPct ?? null,
        notes: body.notes ?? null,
      })
      .returning();

    return NextResponse.json(stat);
  } catch (err) {
    console.error('POST /api/stats error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
