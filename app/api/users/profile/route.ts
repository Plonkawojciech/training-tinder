import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

  try {
    const result = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (result.length === 0) {
      return NextResponse.json(null);
    }
    return NextResponse.json(result[0]);
  } catch (err) {
    console.error('GET /api/users/profile error:', err);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

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
      gymName?: string | null;
      strengthLevel?: string | null;
      trainingSplits?: string[];
      goals?: string[];
      heightCm?: number | null;
      // Advanced athlete fields
      athleteLevel?: string | null;
      ftpWatts?: number | null;
      vo2max?: number | null;
      restingHr?: number | null;
      maxHr?: number | null;
      // Demographics
      age?: number | null;
      gender?: string | null;
      weightKg?: number | null;
      profileSongUrl?: string | null;
    };

    // Basic input validation
    if (body.username !== undefined) {
      const u = body.username.trim();
      if (u.length < 3 || u.length > 30) {
        return NextResponse.json({ error: 'Username musi mieć 3–30 znaków' }, { status: 400 });
      }
      if (!/^[a-zA-Z0-9_.-]+$/.test(u)) {
        return NextResponse.json({ error: 'Username może zawierać tylko litery, cyfry, _, . i -' }, { status: 400 });
      }
    }
    if (body.age !== undefined && body.age !== null && (body.age < 10 || body.age > 100)) {
      return NextResponse.json({ error: 'Nieprawidłowy wiek (10–100)' }, { status: 400 });
    }
    if (body.weightKg !== undefined && body.weightKg !== null && (body.weightKg < 30 || body.weightKg > 300)) {
      return NextResponse.json({ error: 'Nieprawidłowa waga (30–300 kg)' }, { status: 400 });
    }
    if (body.ftpWatts !== undefined && body.ftpWatts !== null && (body.ftpWatts < 50 || body.ftpWatts > 600)) {
      return NextResponse.json({ error: 'Nieprawidłowe FTP (50–600 W)' }, { status: 400 });
    }
    if (body.heightCm !== undefined && body.heightCm !== null && (body.heightCm < 100 || body.heightCm > 250)) {
      return NextResponse.json({ error: 'Nieprawidłowy wzrost (100–250 cm)' }, { status: 400 });
    }

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
          gymName: body.gymName ?? null,
          strengthLevel: body.strengthLevel ?? null,
          trainingSplits: body.trainingSplits ?? [],
          goals: body.goals ?? [],
          heightCm: body.heightCm ?? null,
          athleteLevel: body.athleteLevel ?? null,
          ftpWatts: body.ftpWatts ?? null,
          vo2max: body.vo2max ?? null,
          restingHr: body.restingHr ?? null,
          maxHr: body.maxHr ?? null,
          age: body.age ?? null,
          gender: body.gender ?? null,
          weightKg: body.weightKg ?? null,
          profileSongUrl: body.profileSongUrl ?? null,
        })
        .returning();
      return NextResponse.json(created);
    } else {
      // Merge: only override fields that were explicitly sent (not undefined)
      const updates = Object.fromEntries(
        Object.entries(body).filter(([, v]) => v !== undefined),
      );
      const [updated] = await db
        .update(users)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(users.clerkId, userId))
        .returning();
      return NextResponse.json(updated);
    }
  } catch (err) {
    console.error('PUT /api/users/profile error:', err);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
