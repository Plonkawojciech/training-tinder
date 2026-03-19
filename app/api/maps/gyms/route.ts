import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { searchNearbyGyms } from '@/lib/maps';
import { unauthorized, serverError, badRequest, ErrorCode } from '@/lib/api-errors';

export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') ?? '');
  const lng = parseFloat(searchParams.get('lng') ?? '');
  const radiusRaw = parseInt(searchParams.get('radius') ?? '5000');
  const radius = isNaN(radiusRaw) ? 5000 : radiusRaw;

  if (isNaN(lat) || isNaN(lng)) {
    return badRequest(ErrorCode.INVALID_COORDINATES, 'lat and lng are required');
  }

  try {
    const gyms = await searchNearbyGyms(lat, lng, radius);
    return NextResponse.json(gyms);
  } catch (err) {
    console.error('GET /api/maps/gyms error:', err);
    return serverError();
  }
}
