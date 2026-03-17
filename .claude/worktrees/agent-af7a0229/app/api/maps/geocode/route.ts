import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { geocodeAddress } from '@/lib/maps';

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json() as { address?: string };
  if (!body.address) {
    return NextResponse.json({ error: 'address is required' }, { status: 400 });
  }

  const result = await geocodeAddress(body.address);
  if (!result) {
    return NextResponse.json({ error: 'Could not geocode address' }, { status: 404 });
  }

  return NextResponse.json(result);
}
