import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { authUsers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

  try {
    const { displayName } = await request.json() as { displayName?: string };

    await db
      .update(authUsers)
      .set({ displayName: displayName?.trim() ?? null })
      .where(eq(authUsers.email, userId));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[tt/auth/profile]', err);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
