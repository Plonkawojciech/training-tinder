import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { authUsers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ userId: null }, { status: 401 });

  try {
    const [row] = await db
      .select({ displayName: authUsers.displayName })
      .from(authUsers)
      .where(eq(authUsers.email, userId))
      .limit(1);
    return NextResponse.json({ userId, displayName: row?.displayName ?? null });
  } catch {
    return NextResponse.json({ userId, displayName: null });
  }
}
