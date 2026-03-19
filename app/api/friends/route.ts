import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { friends, users } from '@/lib/db/schema';
import { eq, or, and, inArray, ilike } from 'drizzle-orm';
import { unauthorized, notFound, serverError, badRequest, apiError, ErrorCode } from '@/lib/api-errors';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const myFriends = await db.select().from(friends).where(
      or(eq(friends.requesterId, userId), eq(friends.receiverId, userId))
    );

    // Batch-fetch only the users we actually need
    const otherIds = myFriends.map((f) => f.requesterId === userId ? f.receiverId : f.requesterId);
    const relevantUsers = otherIds.length > 0
      ? await db.select({
          authEmail: users.authEmail, username: users.username,
          avatarUrl: users.avatarUrl, city: users.city,
        }).from(users).where(inArray(users.authEmail, otherIds))
      : [];

    const userMap = Object.fromEntries(relevantUsers.map((u) => [u.authEmail, u]));

    const enriched = myFriends.map(f => ({
      ...f,
      otherUser: f.requesterId === userId ? userMap[f.receiverId] : userMap[f.requesterId],
    }));

    return NextResponse.json(enriched);
  } catch (err) {
    console.error('GET /api/friends error:', err);
    return serverError();
  }
}

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const body = await request.json() as { query: string };
    const { query } = body;
    if (!query?.trim()) return badRequest(ErrorCode.MISSING_FIELDS, 'Query required');

    const targetRows = await db.select().from(users)
      .where(ilike(users.username, query.trim()))
      .limit(1);
    const target = targetRows[0] ?? null;

    if (!target) return notFound('User not found');
    if (target.authEmail === userId) return badRequest(ErrorCode.SELF_ACTION, 'Cannot add yourself');

    const existing = await db.select().from(friends).where(
      or(
        and(eq(friends.requesterId, userId), eq(friends.receiverId, target.authEmail)),
        and(eq(friends.requesterId, target.authEmail), eq(friends.receiverId, userId)),
      )
    );
    if (existing.length > 0) {
      return apiError(ErrorCode.ALREADY_FRIENDS, 'Already friends or request pending', 409);
    }

    const [created] = await db.insert(friends).values({
      requesterId: userId,
      receiverId: target.authEmail,
      status: 'pending',
    }).returning();

    return NextResponse.json({ ok: true, friend: created, targetUser: { username: target.username, avatarUrl: target.avatarUrl } });
  } catch (err) {
    console.error('POST /api/friends error:', err);
    return serverError();
  }
}
