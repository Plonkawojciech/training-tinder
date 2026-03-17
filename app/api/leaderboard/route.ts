import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { users, sessionParticipants } from '@/lib/db/schema';
import { desc, sql, inArray } from 'drizzle-orm';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

  try {
    const topUsers = await db
      .select({
        clerkId: users.clerkId,
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

    // Batch-fetch session counts only for these 50 users
    const userIds = topUsers.map((u) => u.clerkId);
    const sessionCountRows = userIds.length > 0
      ? await db
          .select({
            userId: sessionParticipants.userId,
            count: sql<number>`count(*)`,
          })
          .from(sessionParticipants)
          .where(inArray(sessionParticipants.userId, userIds))
          .groupBy(sessionParticipants.userId)
      : [];
    const sessionCounts = Object.fromEntries(sessionCountRows.map((r) => [r.userId, Number(r.count)]));

    const leaderboard = topUsers.map((u, index) => ({
      rank: index + 1,
      clerkId: u.clerkId,
      username: u.username,
      avatarUrl: u.avatarUrl,
      sportTypes: u.sportTypes,
      weeklyKm: u.weeklyKm ?? 0,
      sessionCount: sessionCounts[u.clerkId] ?? 0,
      city: u.city,
      isCurrentUser: u.clerkId === userId,
    }));

    return NextResponse.json(leaderboard);
  } catch (err) {
    console.error('GET /api/leaderboard error:', err);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
