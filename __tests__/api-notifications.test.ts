import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---

vi.mock('@/lib/server-auth', () => ({
  getAuthUserId: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/lib/db/schema', () => ({
  notifications: {
    id: 'id',
    userId: 'user_id',
    type: 'type',
    dataJson: 'data_json',
    read: 'read',
    createdAt: 'created_at',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ _eq: val })),
  desc: vi.fn((col: unknown) => ({ _desc: col })),
}));

import { GET, PATCH } from '@/app/api/notifications/route';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';

const fakeNotifications = [
  {
    id: 1,
    userId: 'user-abc',
    type: 'friend_request',
    dataJson: { fromUser: 'jan' },
    read: false,
    createdAt: new Date('2026-03-19T10:00:00Z'),
  },
  {
    id: 2,
    userId: 'user-abc',
    type: 'session_invite',
    dataJson: { sessionId: 42 },
    read: true,
    createdAt: new Date('2026-03-18T10:00:00Z'),
  },
];

// --- GET tests ---

describe('GET /api/notifications', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 401 when not authorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns notifications list', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(fakeNotifications),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(selectChain);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(json)).toBe(true);
    expect(json).toHaveLength(2);
    expect(json[0].type).toBe('friend_request');
    expect(json[1].type).toBe('session_invite');
  });

  it('returns empty array when no notifications exist', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(selectChain);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual([]);
  });

  it('returns 500 on DB error', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockRejectedValue(new Error('DB timeout')),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(selectChain);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('passes userId to eq() for filtering', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-xyz');

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(selectChain);

    await GET();

    const { eq } = await import('drizzle-orm');
    expect(eq).toHaveBeenCalledWith('user_id', 'user-xyz');
  });
});

// --- PATCH tests ---

describe('PATCH /api/notifications (mark as read)', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 401 when not authorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await PATCH();
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('marks all notifications as read and returns success', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(undefined),
    };
    (db.update as ReturnType<typeof vi.fn>).mockReturnValue(updateChain);

    const res = await PATCH();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(db.update).toHaveBeenCalled();
    expect(updateChain.set).toHaveBeenCalledWith({ read: true });
  });

  it('returns 500 on DB update error', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockRejectedValue(new Error('Update failed')),
    };
    (db.update as ReturnType<typeof vi.fn>).mockReturnValue(updateChain);

    const res = await PATCH();
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('passes userId to eq() for mark-as-read', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-xyz');

    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(undefined),
    };
    (db.update as ReturnType<typeof vi.fn>).mockReturnValue(updateChain);

    await PATCH();

    const { eq } = await import('drizzle-orm');
    expect(eq).toHaveBeenCalledWith('user_id', 'user-xyz');
  });

  it('PATCH does not call db.select', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(undefined),
    };
    (db.update as ReturnType<typeof vi.fn>).mockReturnValue(updateChain);

    await PATCH();

    expect(db.select).not.toHaveBeenCalled();
  });

  it('GET response has application/json content type', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(fakeNotifications),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(selectChain);

    const res = await GET();
    expect(res.headers.get('content-type')).toContain('application/json');
  });

  it('PATCH response has application/json content type', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(undefined),
    };
    (db.update as ReturnType<typeof vi.fn>).mockReturnValue(updateChain);

    const res = await PATCH();
    expect(res.headers.get('content-type')).toContain('application/json');
  });

  it('notifications include read status', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(fakeNotifications),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(selectChain);

    const res = await GET();
    const json = await res.json();

    expect(json[0].read).toBe(false);
    expect(json[1].read).toBe(true);
  });

  it('notifications include dataJson', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(fakeNotifications),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(selectChain);

    const res = await GET();
    const json = await res.json();

    expect(json[0].dataJson).toEqual({ fromUser: 'jan' });
    expect(json[1].dataJson).toEqual({ sessionId: 42 });
  });

  it('notifications preserve id field', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(fakeNotifications),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(selectChain);

    const res = await GET();
    const json = await res.json();

    expect(json[0].id).toBe(1);
    expect(json[1].id).toBe(2);
  });

  it('PATCH returns success true not false', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(undefined),
    };
    (db.update as ReturnType<typeof vi.fn>).mockReturnValue(updateChain);

    const res = await PATCH();
    const json = await res.json();

    expect(json.success).not.toBe(false);
    expect(typeof json.success).toBe('boolean');
  });

  it('GET uses desc() for ordering', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(selectChain);

    await GET();

    const { desc } = await import('drizzle-orm');
    expect(desc).toHaveBeenCalledWith('created_at');
  });
});
