import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { userStats, workoutLogs, personalRecords, exercises } from '@/lib/db/schema';
import { eq, desc, inArray, sql, and, gte } from 'drizzle-orm';

export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

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
      const weekAgoStr = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const monthAgoStr = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      // Use SQL aggregates instead of loading all rows into memory
      const [totalWRes, weekWRes, monthWRes, totalPRRes, monthPRRes, monthSetsRes] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(workoutLogs).where(eq(workoutLogs.userId, userId)),
        db.select({ count: sql<number>`count(*)` }).from(workoutLogs).where(and(eq(workoutLogs.userId, userId), gte(workoutLogs.date, weekAgoStr))),
        db.select({ count: sql<number>`count(*)` }).from(workoutLogs).where(and(eq(workoutLogs.userId, userId), gte(workoutLogs.date, monthAgoStr))),
        db.select({ count: sql<number>`count(*)` }).from(personalRecords).where(eq(personalRecords.userId, userId)),
        db.select({ count: sql<number>`count(*)` }).from(personalRecords).where(and(eq(personalRecords.userId, userId), gte(personalRecords.achievedAt, new Date(monthAgoStr)))),
        db.select({ total: sql<number>`coalesce(sum(${exercises.sets}), 0)` })
          .from(exercises)
          .innerJoin(workoutLogs, eq(exercises.workoutLogId, workoutLogs.id))
          .where(and(eq(workoutLogs.userId, userId), gte(workoutLogs.date, monthAgoStr))),
      ]);

      return NextResponse.json({
        totalWorkouts: Number(totalWRes[0]?.count ?? 0),
        weekWorkouts: Number(weekWRes[0]?.count ?? 0),
        monthWorkouts: Number(monthWRes[0]?.count ?? 0),
        monthPRs: Number(monthPRRes[0]?.count ?? 0),
        totalSets: Number(monthSetsRes[0]?.total ?? 0),
        totalPRs: Number(totalPRRes[0]?.count ?? 0),
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
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

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
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
