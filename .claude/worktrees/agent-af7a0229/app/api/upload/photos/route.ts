import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { put } from '@vercel/blob';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const maxDuration = 30;

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files.length) return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    if (files.length > 10) return NextResponse.json({ error: 'Max 10 files at once' }, { status: 400 });

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    const urls: string[] = [];

    for (const file of files) {
      if (file.size > 8 * 1024 * 1024) continue; // skip >8MB
      if (!allowed.includes(file.type)) continue;
      const ext = file.name.split('.').pop() ?? 'jpg';
      const filename = `photos/${userId}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const blob = await put(filename, file, { access: 'public', contentType: file.type });
      urls.push(blob.url);
    }

    // Append new URLs to existing photoUrls
    const existing = await db.select({ photoUrls: users.photoUrls }).from(users).where(eq(users.clerkId, userId)).limit(1);
    const current = existing[0]?.photoUrls ?? [];
    const updated = [...(current as string[]), ...urls].slice(0, 20); // max 20 photos

    await db.update(users).set({ photoUrls: updated }).where(eq(users.clerkId, userId));

    return NextResponse.json({ urls, total: updated.length });
  } catch (err) {
    console.error('POST /api/upload/photos error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { url } = await request.json() as { url: string };
    const existing = await db.select({ photoUrls: users.photoUrls }).from(users).where(eq(users.clerkId, userId)).limit(1);
    const current = (existing[0]?.photoUrls ?? []) as string[];
    const updated = current.filter((u) => u !== url);
    await db.update(users).set({ photoUrls: updated }).where(eq(users.clerkId, userId));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/upload/photos error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
