import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { trainingPlans, users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const mine = searchParams.get('mine') === 'true';
  const sport = searchParams.get('sport');
  const difficulty = searchParams.get('difficulty');

  try {
    let rows: typeof trainingPlans.$inferSelect[];
    if (mine) {
      rows = await db
        .select()
        .from(trainingPlans)
        .where(eq(trainingPlans.creatorId, userId))
        .orderBy(desc(trainingPlans.createdAt));
    } else {
      rows = await db
        .select()
        .from(trainingPlans)
        .where(eq(trainingPlans.isPublic, true))
        .orderBy(desc(trainingPlans.createdAt));
    }

    if (sport) rows = rows.filter((p) => p.sportType === sport);
    if (difficulty) rows = rows.filter((p) => p.difficulty === difficulty);

    const enriched = await Promise.all(
      rows.map(async (plan) => {
        const creator = await db
          .select({ username: users.username, avatarUrl: users.avatarUrl })
          .from(users)
          .where(eq(users.clerkId, plan.creatorId))
          .limit(1);
        return { ...plan, creator: creator[0] ?? null };
      })
    );

    return NextResponse.json(enriched);
  } catch (err) {
    console.error('GET /api/plans error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json() as {
      title: string;
      description?: string;
      sportType: string;
      difficulty: string;
      durationWeeks: number;
      isPublic?: boolean;
    };

    const [plan] = await db
      .insert(trainingPlans)
      .values({
        creatorId: userId,
        title: body.title,
        description: body.description ?? null,
        sportType: body.sportType,
        difficulty: body.difficulty,
        durationWeeks: body.durationWeeks,
        isPublic: body.isPublic ?? true,
      })
      .returning();

    return NextResponse.json(plan);
  } catch (err) {
    console.error('POST /api/plans error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
