import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { trainingPlans, users } from '@/lib/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';

export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

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

    if (rows.length === 0) return NextResponse.json([]);

    // Batch-fetch all creators in one query — no N+1
    const creatorIds = [...new Set(rows.map((p) => p.creatorId))];
    const creatorRows = await db
      .select({ clerkId: users.clerkId, username: users.username, avatarUrl: users.avatarUrl })
      .from(users)
      .where(inArray(users.clerkId, creatorIds));
    const creatorMap = Object.fromEntries(creatorRows.map((u) => [u.clerkId, u]));

    const enriched = rows.map((plan) => ({ ...plan, creator: creatorMap[plan.creatorId] ?? null }));

    return NextResponse.json(enriched);
  } catch (err) {
    console.error('GET /api/plans error:', err);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

  try {
    const body = await request.json() as {
      title?: unknown;
      description?: unknown;
      sportType?: unknown;
      difficulty?: unknown;
      durationWeeks?: unknown;
      isPublic?: unknown;
    };

    if (typeof body.title !== 'string' || body.title.trim().length < 2) {
      return NextResponse.json({ error: 'Tytuł jest wymagany (min. 2 znaki)' }, { status: 400 });
    }
    if (body.title.trim().length > 120) {
      return NextResponse.json({ error: 'Tytuł może mieć max. 120 znaków' }, { status: 400 });
    }
    if (typeof body.sportType !== 'string' || !body.sportType.trim()) {
      return NextResponse.json({ error: 'Sport jest wymagany' }, { status: 400 });
    }
    if (typeof body.difficulty !== 'string' || !body.difficulty.trim()) {
      return NextResponse.json({ error: 'Poziom trudności jest wymagany' }, { status: 400 });
    }

    const durationWeeks = Number(body.durationWeeks);
    if (!Number.isInteger(durationWeeks) || durationWeeks < 1 || durationWeeks > 52) {
      return NextResponse.json({ error: 'Czas trwania musi być między 1 a 52 tygodniami' }, { status: 400 });
    }

    const description = typeof body.description === 'string' ? body.description.trim().slice(0, 2000) : null;

    const [plan] = await db
      .insert(trainingPlans)
      .values({
        creatorId: userId,
        title: body.title.trim(),
        description,
        sportType: body.sportType.trim(),
        difficulty: body.difficulty.trim(),
        durationWeeks,
        isPublic: body.isPublic === true,
      })
      .returning();

    return NextResponse.json(plan);
  } catch (err) {
    console.error('POST /api/plans error:', err);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
