import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { authUsers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { encrypt } from '@/lib/crypto';
import { unauthorized, serverError, badRequest, ErrorCode } from '@/lib/api-errors';

// GET: check if user has Garmin connected
export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const [row] = await db
      .select({ garminEmail: authUsers.garminEmail })
      .from(authUsers)
      .where(eq(authUsers.email, userId))
      .limit(1);
    return NextResponse.json({ connected: !!row?.garminEmail });
  } catch (err) {
    console.error('GET /api/integrations/garmin error:', err);
    return serverError();
  }
}

// POST: save Garmin credentials
export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const { garminEmail, garminPassword } = await request.json() as {
      garminEmail: string; garminPassword: string;
    };

    if (!garminEmail || !garminPassword) {
      return badRequest(ErrorCode.GARMIN_CREDENTIALS_REQUIRED, 'Garmin email and password are required');
    }

    // Verify credentials work before saving
    try {
      const { GarminConnect } = await import('garmin-connect');
      const gc = new GarminConnect({ username: garminEmail, password: garminPassword });
      await gc.login();
    } catch {
      return badRequest(ErrorCode.INVALID_CREDENTIALS, 'Invalid Garmin credentials');
    }

    await db
      .update(authUsers)
      .set({ garminEmail: garminEmail.trim(), garminPassword: encrypt(garminPassword) })
      .where(eq(authUsers.email, userId));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('POST /api/integrations/garmin error:', err);
    return serverError();
  }
}

// DELETE: disconnect Garmin
export async function DELETE() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    await db
      .update(authUsers)
      .set({ garminEmail: null, garminPassword: null })
      .where(eq(authUsers.email, userId));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/integrations/garmin error:', err);
    return serverError();
  }
}
