import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { spotterRequests, users } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

  try {
    const body = await request.json() as {
      exercise?: unknown;
      weightKg?: unknown;
      gymName?: unknown;
      gymPlaceId?: unknown;
      message?: unknown;
    };

    if (typeof body.exercise !== 'string' || body.exercise.trim().length < 1) {
      return NextResponse.json({ error: 'exercise jest wymagany' }, { status: 400 });
    }
    if (typeof body.gymName !== 'string' || body.gymName.trim().length < 1) {
      return NextResponse.json({ error: 'gymName jest wymagany' }, { status: 400 });
    }
    if (body.exercise.trim().length > 100 || body.gymName.trim().length > 150) {
      return NextResponse.json({ error: 'Dane są za długie' }, { status: 400 });
    }

    const weightKg = body.weightKg !== undefined ? Number(body.weightKg) : null;
    if (weightKg !== null && (isNaN(weightKg) || weightKg < 0 || weightKg > 500)) {
      return NextResponse.json({ error: 'Nieprawidłowy ciężar' }, { status: 400 });
    }

    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 300) : null;
    const gymPlaceId = typeof body.gymPlaceId === 'string' ? body.gymPlaceId.slice(0, 200) : null;

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const [spotterReq] = await db
      .insert(spotterRequests)
      .values({
        requesterId: userId,
        exercise: body.exercise.trim(),
        weightKg,
        gymName: body.gymName.trim(),
        gymPlaceId,
        message,
        status: 'open',
        expiresAt,
      })
      .returning();

    return NextResponse.json(spotterReq);
  } catch (err) {
    console.error('POST /api/spotter error:', err);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const gymPlaceId = searchParams.get('gymPlaceId');
  const gymName = searchParams.get('gymName');
  const now = new Date();

  try {
    // Filter expired in DB rather than loading all then filtering in JS
    const whereConditions = [
      eq(spotterRequests.status, 'open'),
      sql`(${spotterRequests.expiresAt} IS NULL OR ${spotterRequests.expiresAt} > ${now})`,
    ] as Parameters<typeof and>;

    if (gymPlaceId) whereConditions.push(eq(spotterRequests.gymPlaceId, gymPlaceId));
    else if (gymName) whereConditions.push(eq(spotterRequests.gymName, gymName));

    const results = await db
      .select({
        request: spotterRequests,
        requester: {
          clerkId: users.clerkId,
          username: users.username,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(spotterRequests)
      .leftJoin(users, eq(spotterRequests.requesterId, users.clerkId))
      .where(and(...whereConditions))
      .limit(50);

    return NextResponse.json(results.filter((r) => r.requester !== null));
  } catch (err) {
    console.error('GET /api/spotter error:', err);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

  try {
    const body = await request.json() as { id?: unknown; action?: unknown };

    const spotterReqId = Number(body.id);
    if (!Number.isInteger(spotterReqId) || spotterReqId <= 0) {
      return NextResponse.json({ error: 'Nieprawidłowe id' }, { status: 400 });
    }
    if (body.action !== 'accept' && body.action !== 'close') {
      return NextResponse.json({ error: 'Nieprawidłowa akcja' }, { status: 400 });
    }

    // Load the request first to enforce ownership rules
    const [existing] = await db
      .select()
      .from(spotterRequests)
      .where(eq(spotterRequests.id, spotterReqId))
      .limit(1);

    if (!existing) return NextResponse.json({ error: 'Nie znaleziono' }, { status: 404 });
    if (existing.status !== 'open') {
      return NextResponse.json({ error: 'Prośba jest już nieaktywna' }, { status: 409 });
    }

    if (body.action === 'close') {
      // Only the requester can close their own request
      if (existing.requesterId !== userId) {
        return NextResponse.json({ error: 'Brak dostępu' }, { status: 403 });
      }
      const [updated] = await db
        .update(spotterRequests)
        .set({ status: 'closed' })
        .where(eq(spotterRequests.id, spotterReqId))
        .returning();
      return NextResponse.json(updated);
    }

    // action === 'accept'
    // Cannot accept your own request
    if (existing.requesterId === userId) {
      return NextResponse.json({ error: 'Nie możesz zaakceptować własnej prośby' }, { status: 400 });
    }

    const [updated] = await db
      .update(spotterRequests)
      .set({ status: 'accepted', acceptedById: userId })
      .where(eq(spotterRequests.id, spotterReqId))
      .returning();

    return NextResponse.json(updated);
  } catch (err) {
    console.error('PATCH /api/spotter error:', err);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
