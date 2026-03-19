import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { geocodeAddress } from '@/lib/maps';
import { unauthorized, notFound, serverError, badRequest, ErrorCode } from '@/lib/api-errors';

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const body = await request.json() as { address?: string };
  if (!body.address) {
    return badRequest(ErrorCode.MISSING_FIELDS, 'Address is required');
  }

  try {
    const result = await geocodeAddress(body.address);
    if (!result) {
      return notFound('Could not geocode address');
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error('POST /api/maps/geocode error:', err);
    return serverError();
  }
}
