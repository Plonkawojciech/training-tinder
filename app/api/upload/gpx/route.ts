import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { put } from '@vercel/blob';
import { unauthorized, serverError, badRequest, ErrorCode } from '@/lib/api-errors';

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return badRequest(ErrorCode.NO_FILES_PROVIDED, 'No file provided');
    }

    if (file.size > 10 * 1024 * 1024) {
      return badRequest(ErrorCode.FILE_TOO_LARGE, 'File too large (max 10MB)');
    }

    const isGpx = file.name.endsWith('.gpx') || file.type === 'application/gpx+xml' || file.type === 'text/xml';
    if (!isGpx) {
      return badRequest(ErrorCode.INVALID_FILE_TYPE, 'Only .gpx files are allowed');
    }

    const filename = `gpx/${userId}-${Date.now()}.gpx`;

    const blob = await put(filename, file, {
      access: 'public',
      contentType: 'application/gpx+xml',
    });

    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error('POST /api/upload/gpx error:', err);
    return serverError();
  }
}
