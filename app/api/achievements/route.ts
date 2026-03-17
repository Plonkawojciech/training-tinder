import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { userAchievements, workoutLogs, personalRecords } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

  try {
    const achievements = await db
      .select()
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId))
      .orderBy(desc(userAchievements.unlockedAt));

    // Auto-check and unlock new achievements
    const workouts = await db
      .select()
      .from(workoutLogs)
      .where(eq(workoutLogs.userId, userId));

    const prs = await db
      .select()
      .from(personalRecords)
      .where(eq(personalRecords.userId, userId));

    const unlockedTypes = new Set(achievements.map((a) => a.type));
    const toUnlock: typeof userAchievements.$inferInsert[] = [];

    if (workouts.length >= 1 && !unlockedTypes.has('first_workout')) {
      toUnlock.push({
        userId,
        type: 'first_workout',
        title: 'First Rep',
        description: 'Logged your first workout',
        icon: '💪',
      });
    }
    if (workouts.length >= 10 && !unlockedTypes.has('ten_workouts')) {
      toUnlock.push({
        userId,
        type: 'ten_workouts',
        title: 'Consistent',
        description: 'Logged 10 workouts',
        icon: '🔥',
      });
    }
    if (workouts.length >= 50 && !unlockedTypes.has('fifty_workouts')) {
      toUnlock.push({
        userId,
        type: 'fifty_workouts',
        title: 'Dedicated',
        description: 'Logged 50 workouts',
        icon: '🏆',
      });
    }
    if (prs.length >= 1 && !unlockedTypes.has('first_pr')) {
      toUnlock.push({
        userId,
        type: 'first_pr',
        title: 'New Record',
        description: 'Set your first personal record',
        icon: '🥇',
      });
    }
    if (prs.length >= 10 && !unlockedTypes.has('ten_prs')) {
      toUnlock.push({
        userId,
        type: 'ten_prs',
        title: 'Record Breaker',
        description: 'Set 10 personal records',
        icon: '⚡',
      });
    }

    if (toUnlock.length > 0) {
      await db.insert(userAchievements).values(toUnlock);
    }

    const allAchievements = await db
      .select()
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId))
      .orderBy(desc(userAchievements.unlockedAt));

    return NextResponse.json(allAchievements);
  } catch (err) {
    console.error('GET /api/achievements error:', err);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
