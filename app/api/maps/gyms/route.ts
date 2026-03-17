import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { searchNearbyGyms } from '@/lib/maps';

export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') ?? '');
  const lng = parseFloat(searchParams.get('lng') ?? '');
  const radiusRaw = parseInt(searchParams.get('radius') ?? '5000');
  const radius = isNaN(radiusRaw) ? 5000 : radiusRaw;

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
  }

  try {
    const gyms = await searchNearbyGyms(lat, lng, radius);
    return NextResponse.json(gyms);
  } catch (err) {
    console.error('GET /api/maps/gyms error:', err);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
