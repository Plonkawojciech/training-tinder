import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { userEvents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Garmin Calendar API returns planned workouts
const GARMIN_CALENDAR_API = 'https://connect.garmin.com/modern/proxy/calendar-service';

interface GarminCalendarItem {
  id?: number;
  title?: string;
  startTimestampLocal?: string; // "2024-01-15 08:00:00"
  duration?: number; // seconds
  sport?: string;
  activityType?: { typeKey?: string };
  itemType?: string; // "workout" | "race" | "training_plan"
  isScheduled?: boolean;
}

function mapGarminSport(sport: string | undefined, typeKey: string | undefined): string {
  const s = (sport ?? typeKey ?? '').toLowerCase();
  if (s.includes('run')) return 'running';
  if (s.includes('cycl') || s.includes('bike')) return 'cycling';
  if (s.includes('swim')) return 'swimming';
  if (s.includes('strength') || s.includes('gym')) return 'gym';
  if (s.includes('trail')) return 'trail_running';
  return 'other';
}

async function fetchGarminCalendar(
  cookies: string,
  year: number,
  month: number // 1-12
): Promise<GarminCalendarItem[]> {
  const url = `${GARMIN_CALENDAR_API}/year/${year}/month/${month - 1}`; // Garmin uses 0-indexed months
  const res = await fetch(url, {
    headers: {
      Cookie: cookies,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      NK: 'NT',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) return [];

  const data = await res.json() as { calendarItems?: GarminCalendarItem[] };
  return data.calendarItems ?? [];
}

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

  let body: { cookies: string };
  try {
    body = await request.json() as { cookies: string };
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  if (!body.cookies) {
    return NextResponse.json({ error: 'cookies required' }, { status: 400 });
  }

  try {
    const now = new Date();
    // Fetch next 2 months of calendar
    const months = [
      { year: now.getFullYear(), month: now.getMonth() + 1 },
      {
        year: now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear(),
        month: now.getMonth() === 11 ? 1 : now.getMonth() + 2,
      },
    ];

    const allItems: GarminCalendarItem[] = [];
    for (const { year, month } of months) {
      const items = await fetchGarminCalendar(body.cookies, year, month);
      allItems.push(...items);
    }

    // Filter future scheduled workouts only
    const future = allItems.filter((item) => {
      if (!item.startTimestampLocal) return false;
      const d = new Date(item.startTimestampLocal);
      return d >= now && (item.itemType === 'workout' || item.isScheduled);
    });

    // Save to userEvents table
    let saved = 0;
    for (const item of future.slice(0, 20)) {
      const eventDate = item.startTimestampLocal
        ? item.startTimestampLocal.split(' ')[0]
        : '';
      if (!eventDate) continue;

      const sport = mapGarminSport(item.sport, item.activityType?.typeKey);

      try {
        await db.insert(userEvents).values({
          userId,
          eventName: item.title ?? 'Garmin Planned Workout',
          eventType: 'garmin_planned',
          sport,
          eventDate,
          distanceKm: null,
          targetTimeSec: item.duration ?? null,
          status: 'registered',
          isPublic: true,
        }).onConflictDoNothing();
        saved++;
      } catch {
        // skip duplicates
      }
    }

    return NextResponse.json({ ok: true, imported: saved, found: future.length });
  } catch (err) {
    console.error('Garmin planned import error:', err);
    return NextResponse.json({ error: 'Failed to fetch Garmin calendar' }, { status: 500 });
  }
}

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

  try {
    const allEvents = await db
      .select()
      .from(userEvents)
      .where(eq(userEvents.userId, userId));

    const now = new Date().toISOString().split('T')[0];
    const planned = allEvents.filter(
      (e) => e.eventType === 'garmin_planned' && e.eventDate >= now
    );

    return NextResponse.json(planned);
  } catch (err) {
    console.error('GET /api/garmin/planned error:', err);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
