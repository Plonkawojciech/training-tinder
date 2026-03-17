import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { friends, users } from '@/lib/db/schema';
import { eq, or, and, inArray, ilike } from 'drizzle-orm';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

  try {
    const myFriends = await db.select().from(friends).where(
      or(eq(friends.requesterId, userId), eq(friends.receiverId, userId))
    );

    // Batch-fetch only the users we actually need
    const otherIds = myFriends.map((f) => f.requesterId === userId ? f.receiverId : f.requesterId);
    const relevantUsers = otherIds.length > 0
      ? await db.select({
          clerkId: users.clerkId, username: users.username,
          avatarUrl: users.avatarUrl, city: users.city,
        }).from(users).where(inArray(users.clerkId, otherIds))
      : [];

    const userMap = Object.fromEntries(relevantUsers.map((u) => [u.clerkId, u]));

    const enriched = myFriends.map(f => ({
      ...f,
      otherUser: f.requesterId === userId ? userMap[f.receiverId] : userMap[f.requesterId],
    }));

    return NextResponse.json(enriched);
  } catch (err) {
    console.error('GET /api/friends error:', err);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

  try {
    const body = await request.json() as { query: string };
    const { query } = body;
    if (!query?.trim()) return NextResponse.json({ error: 'Query required' }, { status: 400 });

    const targetRows = await db.select().from(users)
      .where(ilike(users.username, query.trim()))
      .limit(1);
    const target = targetRows[0] ?? null;

    if (!target) return NextResponse.json({ error: 'Uzytkownik nie znaleziony' }, { status: 404 });
    if (target.clerkId === userId) return NextResponse.json({ error: 'Nie mozesz dodac siebie' }, { status: 400 });

    const existing = await db.select().from(friends).where(
      or(
        and(eq(friends.requesterId, userId), eq(friends.receiverId, target.clerkId)),
        and(eq(friends.requesterId, target.clerkId), eq(friends.receiverId, userId)),
      )
    );
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Juz jestes znajomym lub zaproszenie oczekuje', existing: existing[0] }, { status: 409 });
    }

    const [created] = await db.insert(friends).values({
      requesterId: userId,
      receiverId: target.clerkId,
      status: 'pending',
    }).returning();

    return NextResponse.json({ ok: true, friend: created, targetUser: { username: target.username, avatarUrl: target.avatarUrl } });
  } catch (err) {
    console.error('POST /api/friends error:', err);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
