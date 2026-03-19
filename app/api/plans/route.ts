import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { trainingPlans, users } from '@/lib/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import { unauthorized, serverError, badRequest, ErrorCode } from '@/lib/api-errors';

export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

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
      .select({ authEmail: users.authEmail, username: users.username, avatarUrl: users.avatarUrl })
      .from(users)
      .where(inArray(users.authEmail, creatorIds));
    const creatorMap = Object.fromEntries(creatorRows.map((u) => [u.authEmail, u]));

    const enriched = rows.map((plan) => ({ ...plan, creator: creatorMap[plan.creatorId] ?? null }));

    return NextResponse.json(enriched);
  } catch (err) {
    console.error('GET /api/plans error:', err);
    return serverError();
  }
}

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

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
      return badRequest(ErrorCode.TITLE_TOO_SHORT, 'Title is required (min 2 characters)');
    }
    if (body.title.trim().length > 120) {
      return badRequest(ErrorCode.CONTENT_TOO_LONG, 'Title must be at most 120 characters');
    }
    if (typeof body.sportType !== 'string' || !body.sportType.trim()) {
      return badRequest(ErrorCode.MISSING_FIELDS, 'Sport type is required');
    }
    if (typeof body.difficulty !== 'string' || !body.difficulty.trim()) {
      return badRequest(ErrorCode.MISSING_FIELDS, 'Difficulty is required');
    }

    const durationWeeks = Number(body.durationWeeks);
    if (!Number.isInteger(durationWeeks) || durationWeeks < 1 || durationWeeks > 52) {
      return badRequest(ErrorCode.INVALID_INPUT, 'Duration must be between 1 and 52 weeks');
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
    return serverError();
  }
}
