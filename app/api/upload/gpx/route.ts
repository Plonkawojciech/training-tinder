import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { put } from '@vercel/blob';

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    const isGpx = file.name.endsWith('.gpx') || file.type === 'application/gpx+xml' || file.type === 'text/xml';
    if (!isGpx) {
      return NextResponse.json({ error: 'Only .gpx files are allowed' }, { status: 400 });
    }

    const filename = `gpx/${userId}-${Date.now()}.gpx`;

    const blob = await put(filename, file, {
      access: 'public',
      contentType: 'application/gpx+xml',
    });

    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error('POST /api/upload/gpx error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
