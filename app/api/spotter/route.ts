import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { spotterRequests, users } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { unauthorized, forbidden, notFound, serverError, badRequest, apiError, ErrorCode } from '@/lib/api-errors';

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const body = await request.json() as {
      exercise?: unknown;
      weightKg?: unknown;
      gymName?: unknown;
      gymPlaceId?: unknown;
      message?: unknown;
    };

    if (typeof body.exercise !== 'string' || body.exercise.trim().length < 1) {
      return badRequest(ErrorCode.MISSING_FIELDS, 'Exercise is required');
    }
    if (typeof body.gymName !== 'string' || body.gymName.trim().length < 1) {
      return badRequest(ErrorCode.MISSING_FIELDS, 'Gym name is required');
    }
    if (body.exercise.trim().length > 100 || body.gymName.trim().length > 150) {
      return badRequest(ErrorCode.CONTENT_TOO_LONG, 'Input data is too long');
    }

    const weightKg = body.weightKg !== undefined ? Number(body.weightKg) : null;
    if (weightKg !== null && (isNaN(weightKg) || weightKg < 0 || weightKg > 500)) {
      return badRequest(ErrorCode.INVALID_WEIGHT, 'Invalid weight');
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
    return serverError();
  }
}

export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

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
          authEmail: users.authEmail,
          username: users.username,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(spotterRequests)
      .leftJoin(users, eq(spotterRequests.requesterId, users.authEmail))
      .where(and(...whereConditions))
      .limit(50);

    return NextResponse.json(results.filter((r) => r.requester !== null));
  } catch (err) {
    console.error('GET /api/spotter error:', err);
    return serverError();
  }
}

export async function PATCH(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const body = await request.json() as { id?: unknown; action?: unknown };

    const spotterReqId = Number(body.id);
    if (!Number.isInteger(spotterReqId) || spotterReqId <= 0) {
      return badRequest(ErrorCode.INVALID_INPUT, 'Invalid id');
    }
    if (body.action !== 'accept' && body.action !== 'close') {
      return badRequest(ErrorCode.INVALID_ACTION, 'Invalid action');
    }

    // Load the request first to enforce ownership rules
    const [existing] = await db
      .select()
      .from(spotterRequests)
      .where(eq(spotterRequests.id, spotterReqId))
      .limit(1);

    if (!existing) return notFound();
    if (existing.status !== 'open') {
      return apiError(ErrorCode.INVALID_STATUS, 'Request is already inactive', 409);
    }

    if (body.action === 'close') {
      // Only the requester can close their own request
      if (existing.requesterId !== userId) {
        return forbidden();
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
      return badRequest(ErrorCode.SELF_ACTION, 'Cannot accept your own request');
    }

    const [updated] = await db
      .update(spotterRequests)
      .set({ status: 'accepted', acceptedById: userId })
      .where(eq(spotterRequests.id, spotterReqId))
      .returning();

    return NextResponse.json(updated);
  } catch (err) {
    console.error('PATCH /api/spotter error:', err);
    return serverError();
  }
}
