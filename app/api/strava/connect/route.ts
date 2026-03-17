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
      return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });
    }
  }

  // Derive base URL from the incoming request host so we never rely on env var formatting
  const requestUrl = new URL(req.url);
  const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;

  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: `${baseUrl}/api/strava/callback`,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read,activity:read_all,profile:read_all',
    state: mode === 'auth' ? 'auth' : 'connect',
  });

  return NextResponse.redirect(`https://www.strava.com/oauth/authorize?${params}`);
}
