import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server-auth', () => ({
  getAuthUserId: vi.fn(),
}));

vi.mock('@vercel/blob', () => ({
  put: vi.fn().mockImplementation(() => Promise.resolve({ url: 'https://blob.vercel.com/test/file.jpg' })),
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/lib/db/schema', () => ({
  users: {
    authEmail: 'clerk_id',
    photoUrls: 'photo_urls',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ _eq: val })),
}));

import { POST as UploadAvatar } from '@/app/api/upload/avatar/route';
import { POST as UploadGpx } from '@/app/api/upload/gpx/route';
import { getAuthUserId } from '@/lib/server-auth';
import { put } from '@vercel/blob';

function makeFileFormData(filename: string, type: string, sizeBytes: number, fieldName = 'file'): FormData {
  const content = new Uint8Array(sizeBytes);
  const file = new File([content], filename, { type });
  const formData = new FormData();
  formData.set(fieldName, file);
  return formData;
}

function makeFormDataRequest(formData: FormData, path: string): Request {
  return new Request(`http://localhost:3000${path}`, {
    method: 'POST',
    body: formData,
  });
}

// --- Upload Avatar tests ---

describe('POST /api/upload/avatar', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (put as ReturnType<typeof vi.fn>).mockResolvedValue({ url: 'https://blob.vercel.com/test/file.jpg' });
  });

  it('returns 401 when not authorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const fd = makeFileFormData('avatar.jpg', 'image/jpeg', 100);
    const res = await UploadAvatar(makeFormDataRequest(fd, '/api/upload/avatar'));
    expect(res.status).toBe(401);
  });

  it('uploads valid image', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const fd = makeFileFormData('avatar.jpg', 'image/jpeg', 1000);
    const res = await UploadAvatar(makeFormDataRequest(fd, '/api/upload/avatar'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.url).toContain('blob.vercel.com');
  });

  it('returns 400 when file too large (>5MB)', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const fd = makeFileFormData('avatar.jpg', 'image/jpeg', 6 * 1024 * 1024);
    const res = await UploadAvatar(makeFormDataRequest(fd, '/api/upload/avatar'));
    expect(res.status).toBe(400);
  });

  it('returns 400 for wrong mime type', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const fd = makeFileFormData('doc.pdf', 'application/pdf', 1000);
    const res = await UploadAvatar(makeFormDataRequest(fd, '/api/upload/avatar'));
    expect(res.status).toBe(400);
  });

  it('returns 400 when no file provided', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const fd = new FormData();
    const res = await UploadAvatar(makeFormDataRequest(fd, '/api/upload/avatar'));
    expect(res.status).toBe(400);
  });
});

// --- Upload GPX tests ---

describe('POST /api/upload/gpx', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (put as ReturnType<typeof vi.fn>).mockResolvedValue({ url: 'https://blob.vercel.com/test/file.jpg' });
  });

  it('returns 401 when not authorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const fd = makeFileFormData('track.gpx', 'application/gpx+xml', 100);
    const res = await UploadGpx(makeFormDataRequest(fd, '/api/upload/gpx'));
    expect(res.status).toBe(401);
  });

  it('uploads valid GPX file', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const fd = makeFileFormData('track.gpx', 'application/gpx+xml', 1000);
    const res = await UploadGpx(makeFormDataRequest(fd, '/api/upload/gpx'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.url).toContain('blob.vercel.com');
  });

  it('returns 400 when file too large (>10MB)', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const fd = makeFileFormData('track.gpx', 'application/gpx+xml', 11 * 1024 * 1024);
    const res = await UploadGpx(makeFormDataRequest(fd, '/api/upload/gpx'));
    expect(res.status).toBe(400);
  });

  it('returns 400 for non-GPX file', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');
    const fd = makeFileFormData('photo.jpg', 'image/jpeg', 1000);
    const res = await UploadGpx(makeFormDataRequest(fd, '/api/upload/gpx'));
    expect(res.status).toBe(400);
  });
});
