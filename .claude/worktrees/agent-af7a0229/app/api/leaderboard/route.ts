import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { users, sessionParticipants } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const allUsers = await db
      .select()
      .from(users)
      .orderBy(desc(users.weeklyKm))
      .limit(50);

    const allParticipants = await db.select().from(sessionParticipants);

    const sessionCounts: Record<string, number> = {};
    allParticipants.forEach((p) => {
      sessionCounts[p.userId] = (sessionCounts[p.userId] ?? 0) + 1;
    });

    const leaderboard = allUsers
      .filter((u) => u.username)
      .map((u, index) => ({
        rank: index + 1,
        clerkId: u.clerkId,
        username: u.username,
        avatarUrl: u.avatarUrl,
        sportTypes: u.sportTypes,
        weeklyKm: u.weeklyKm ?? 0,
        sessionCount: sessionCounts[u.clerkId] ?? 0,
        city: u.city,
        isCurrentUser: u.clerkId === userId,
      }))
      .sort((a, b) => b.weeklyKm - a.weeklyKm)
      .map((u, index) => ({ ...u, rank: index + 1 }));

    return NextResponse.json(leaderboard);
  } catch (err) {
    console.error('GET /api/leaderboard error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
