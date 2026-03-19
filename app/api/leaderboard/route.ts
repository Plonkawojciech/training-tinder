import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { users, sessionParticipants } from '@/lib/db/schema';
import { desc, sql, inArray, gte, and } from 'drizzle-orm';
import { unauthorized, serverError } from '@/lib/api-errors';

export async function GET(req: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period'); // 'week' | 'month' | undefined

  try {
    const topUsers = await db
      .select({
        id: users.authEmail,
        username: users.username,
        avatarUrl: users.avatarUrl,
        sportTypes: users.sportTypes,
        weeklyKm: users.weeklyKm,
        city: users.city,
      })
      .from(users)
      .where(sql`${users.username} IS NOT NULL`)
      .orderBy(desc(users.weeklyKm))
      .limit(50);

    // Compute time-range cutoff for session counts
    let dateCutoff: Date | null = null;
    if (period === 'week') {
      dateCutoff = new Date();
      dateCutoff.setDate(dateCutoff.getDate() - 7);
    } else if (period === 'month') {
      dateCutoff = new Date();
      dateCutoff.setMonth(dateCutoff.getMonth() - 1);
    }

    // Batch-fetch session counts only for these 50 users
    const userIds = topUsers.map((u) => u.id);
    const sessionCountRows = userIds.length > 0
      ? await db
          .select({
            userId: sessionParticipants.userId,
            count: sql<number>`count(*)`,
          })
          .from(sessionParticipants)
          .where(
            dateCutoff
              ? and(inArray(sessionParticipants.userId, userIds), gte(sessionParticipants.joinedAt, dateCutoff))
              : inArray(sessionParticipants.userId, userIds)
          )
          .groupBy(sessionParticipants.userId)
      : [];
    const sessionCounts = Object.fromEntries(sessionCountRows.map((r) => [r.userId, Number(r.count)]));

    const leaderboard = topUsers.map((u, index) => ({
      rank: index + 1,
      id: u.id,
      username: u.username,
      avatarUrl: u.avatarUrl,
      sportTypes: u.sportTypes,
      weeklyKm: u.weeklyKm ?? 0,
      sessionCount: sessionCounts[u.id] ?? 0,
      city: u.city,
      isCurrentUser: u.id === userId,
    }));

    return NextResponse.json(leaderboard);
  } catch (err) {
    console.error('GET /api/leaderboard error:', err);
    return serverError();
  }
}
