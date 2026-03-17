import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { sessionSeries } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

  try {
    const series = await db
      .select()
      .from(sessionSeries)
      .where(eq(sessionSeries.creatorId, userId))
      .orderBy(desc(sessionSeries.createdAt));

    return NextResponse.json(series);
  } catch (err) {
    console.error('GET /api/session-series error:', err);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}

interface CreateSeriesBody {
  dayOfWeek: number;      // 0=Mon ... 6=Sun
  time: string;           // HH:MM
  frequency: string;      // weekly | biweekly | monthly
  location: string;
  minLevel?: string;
  startDate: string;
  endDate?: string;
  title: string;
  sport: string;
  maxParticipants?: number;
  description?: string;
  lat?: number;
  lon?: number;
}

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

  let body: CreateSeriesBody;
  try {
    body = await request.json() as CreateSeriesBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { dayOfWeek, time, frequency, location, minLevel, startDate, endDate, title, sport, maxParticipants, description, lat, lon } = body;

  if (!title || !sport || !location || !startDate || !time || dayOfWeek === undefined) {
    return NextResponse.json({ error: 'Missing required fields: title, sport, location, startDate, time, dayOfWeek' }, { status: 400 });
  }

  if (dayOfWeek < 0 || dayOfWeek > 6) {
    return NextResponse.json({ error: 'dayOfWeek must be 0-6' }, { status: 400 });
  }

  try {
    const [series] = await db
      .insert(sessionSeries)
      .values({
        creatorId: userId,
        title,
        sportType: sport,
        dayOfWeek,
        time,
        frequency: frequency ?? 'weekly',
        location,
        lat: lat ?? null,
        lon: lon ?? null,
        maxParticipants: maxParticipants ?? 10,
        description: description ?? null,
        minLevel: minLevel ?? null,
        startDate,
        endDate: endDate ?? null,
        isActive: true,
      })
      .returning();

    return NextResponse.json(series, { status: 201 });
  } catch (err) {
    console.error('POST /api/session-series error:', err);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
