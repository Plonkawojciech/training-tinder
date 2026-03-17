import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { searchNearbyGyms } from '@/lib/maps';

export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') ?? '');
  const lng = parseFloat(searchParams.get('lng') ?? '');
  const radius = parseInt(searchParams.get('radius') ?? '5000');

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
  }

  const gyms = await searchNearbyGyms(lat, lng, radius);
  return NextResponse.json(gyms);
}
