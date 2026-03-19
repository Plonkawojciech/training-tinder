import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { put } from '@vercel/blob';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { isRateLimited } from '@/lib/rate-limit';
import { unauthorized, serverError, rateLimited, badRequest, ErrorCode } from '@/lib/api-errors';

export const maxDuration = 30;

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  // Rate limit: 10 uploads per user per 5 minutes
  if (isRateLimited(`upload-photos:${userId}`, 10, 5 * 60 * 1000)) {
    return rateLimited();
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files.length) return badRequest(ErrorCode.NO_FILES_PROVIDED, 'No files provided');
    if (files.length > 10) return badRequest(ErrorCode.TOO_MANY_FILES, 'Max 10 files at once');

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    const urls: string[] = [];
    const rejected: { name: string; reason: string }[] = [];

    for (const file of files) {
      if (file.size > 8 * 1024 * 1024) {
        rejected.push({ name: file.name, reason: 'File too large (max 8MB)' });
        continue;
      }
      if (!allowed.includes(file.type)) {
        rejected.push({ name: file.name, reason: `Unsupported type: ${file.type}` });
        continue;
      }
      const mimeToExt: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/heic': 'heic',
      };
      const ext = mimeToExt[file.type] ?? 'jpg';
      const filename = `photos/${userId}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const blob = await put(filename, file, { access: 'public', contentType: file.type });
      urls.push(blob.url);
    }

    // Append new URLs to existing photoUrls
    const existing = await db.select({ photoUrls: users.photoUrls }).from(users).where(eq(users.authEmail, userId)).limit(1);
    const current = existing[0]?.photoUrls ?? [];
    const updated = [...(current as string[]), ...urls].slice(0, 20); // max 20 photos

    await db.update(users).set({ photoUrls: updated }).where(eq(users.authEmail, userId));

    return NextResponse.json({ urls, total: updated.length, rejected });
  } catch (err) {
    console.error('POST /api/upload/photos error:', err);
    return serverError();
  }
}

export async function DELETE(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const { url } = await request.json() as { url: string };
    const existing = await db.select({ photoUrls: users.photoUrls }).from(users).where(eq(users.authEmail, userId)).limit(1);
    const current = (existing[0]?.photoUrls ?? []) as string[];
    const updated = current.filter((u) => u !== url);
    await db.update(users).set({ photoUrls: updated }).where(eq(users.authEmail, userId));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/upload/photos error:', err);
    return serverError();
  }
}
