import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (result.length === 0) {
      return NextResponse.json(null);
    }
    return NextResponse.json(result[0]);
  } catch (err) {
    console.error('GET /api/users/profile error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json() as {
      username?: string;
      bio?: string;
      sportTypes?: string[];
      pacePerKm?: number | null;
      weeklyKm?: number | null;
      city?: string;
      lat?: number | null;
      lon?: number | null;
      availability?: string[];
      avatarUrl?: string | null;
    };

    const existing = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);

    if (existing.length === 0) {
      const [created] = await db
        .insert(users)
        .values({
          clerkId: userId,
          username: body.username ?? null,
          bio: body.bio ?? null,
          avatarUrl: body.avatarUrl ?? null,
          sportTypes: body.sportTypes ?? [],
          pacePerKm: body.pacePerKm ?? null,
          weeklyKm: body.weeklyKm ?? null,
          city: body.city ?? null,
          lat: body.lat ?? null,
          lon: body.lon ?? null,
          availability: body.availability ?? [],
        })
        .returning();
      return NextResponse.json(created);
    } else {
      const [updated] = await db
        .update(users)
        .set({
          username: body.username ?? existing[0].username,
          bio: body.bio !== undefined ? body.bio : existing[0].bio,
          avatarUrl: body.avatarUrl !== undefined ? body.avatarUrl : existing[0].avatarUrl,
          sportTypes: body.sportTypes ?? existing[0].sportTypes,
          pacePerKm: body.pacePerKm !== undefined ? body.pacePerKm : existing[0].pacePerKm,
          weeklyKm: body.weeklyKm !== undefined ? body.weeklyKm : existing[0].weeklyKm,
          city: body.city !== undefined ? body.city : existing[0].city,
          lat: body.lat !== undefined ? body.lat : existing[0].lat,
          lon: body.lon !== undefined ? body.lon : existing[0].lon,
          availability: body.availability ?? existing[0].availability,
          updatedAt: new Date(),
        })
        .where(eq(users.clerkId, userId))
        .returning();
      return NextResponse.json(updated);
    }
  } catch (err) {
    console.error('PUT /api/users/profile error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
