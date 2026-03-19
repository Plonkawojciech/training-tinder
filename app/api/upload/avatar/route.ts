import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { put } from '@vercel/blob';
import { isRateLimited } from '@/lib/rate-limit';
import { unauthorized, serverError, rateLimited, badRequest, ErrorCode } from '@/lib/api-errors';

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  // Rate limit: 10 uploads per user per 5 minutes
  if (isRateLimited(`upload-avatar:${userId}`, 10, 5 * 60 * 1000)) {
    return rateLimited();
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return badRequest(ErrorCode.NO_FILES_PROVIDED, 'No file provided');
    }

    if (file.size > 5 * 1024 * 1024) {
      return badRequest(ErrorCode.FILE_TOO_LARGE, 'File too large (max 5MB)');
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return badRequest(ErrorCode.INVALID_FILE_TYPE, 'Invalid file type');
    }

    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };
    const ext = mimeToExt[file.type] ?? 'jpg';
    const filename = `avatars/${userId}-${Date.now()}.${ext}`;

    const blob = await put(filename, file, {
      access: 'public',
      contentType: file.type,
    });

    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error('POST /api/upload/avatar error:', err);
    return serverError();
  }
}
