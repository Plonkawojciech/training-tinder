import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';

export async function GET(req: NextRequest) {
  if (!process.env.STRAVA_CLIENT_ID) {
    return NextResponse.json({ error: 'Strava not configured' }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('mode'); // 'auth' = login/signup without existing session

  if (mode !== 'auth') {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/strava/callback`,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read,activity:read_all,profile:read_all',
    state: mode === 'auth' ? 'auth' : 'connect',
  });

  return NextResponse.redirect(`https://www.strava.com/oauth/authorize?${params}`);
}
