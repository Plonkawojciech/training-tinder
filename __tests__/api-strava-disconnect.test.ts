import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---

vi.mock('@/lib/server-auth', () => ({
  getAuthUserId: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    delete: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/lib/db/schema', () => ({
  stravaTokens: {
    userId: 'user_id',
  },
  users: {
    authEmail: 'clerk_id',
    stravaVerified: 'strava_verified',
    verifiedPacePerKm: 'verified_pace_per_km',
    stravaStatsJson: 'strava_stats_json',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ _eq: val })),
}));

import { POST } from '@/app/api/strava/disconnect/route';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';

// --- Tests ---

describe('POST /api/strava/disconnect', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 401 when not authorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await POST();
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('deletes strava tokens on success', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const deleteChain = {
      where: vi.fn().mockResolvedValue(undefined),
    };
    (db.delete as ReturnType<typeof vi.fn>).mockReturnValue(deleteChain);

    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(undefined),
    };
    (db.update as ReturnType<typeof vi.fn>).mockReturnValue(updateChain);

    await POST();

    expect(db.delete).toHaveBeenCalled();
  });

  it('updates user fields to remove strava verification', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const deleteChain = {
      where: vi.fn().mockResolvedValue(undefined),
    };
    (db.delete as ReturnType<typeof vi.fn>).mockReturnValue(deleteChain);

    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(undefined),
    };
    (db.update as ReturnType<typeof vi.fn>).mockReturnValue(updateChain);

    await POST();

    expect(db.update).toHaveBeenCalled();
    expect(updateChain.set).toHaveBeenCalledWith({
      stravaVerified: false,
      verifiedPacePerKm: null,
      stravaStatsJson: null,
    });
  });

  it('returns { success: true } on successful disconnect', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const deleteChain = {
      where: vi.fn().mockResolvedValue(undefined),
    };
    (db.delete as ReturnType<typeof vi.fn>).mockReturnValue(deleteChain);

    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(undefined),
    };
    (db.update as ReturnType<typeof vi.fn>).mockReturnValue(updateChain);

    const res = await POST();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it('returns 500 on DB delete error', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const deleteChain = {
      where: vi.fn().mockRejectedValue(new Error('DB connection lost')),
    };
    (db.delete as ReturnType<typeof vi.fn>).mockReturnValue(deleteChain);

    const res = await POST();
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('returns 500 on DB update error', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const deleteChain = {
      where: vi.fn().mockResolvedValue(undefined),
    };
    (db.delete as ReturnType<typeof vi.fn>).mockReturnValue(deleteChain);

    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockRejectedValue(new Error('Update failed')),
    };
    (db.update as ReturnType<typeof vi.fn>).mockReturnValue(updateChain);

    const res = await POST();
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('calls db.delete before db.update', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const callOrder: string[] = [];

    const deleteChain = {
      where: vi.fn().mockImplementation(() => {
        callOrder.push('delete');
        return Promise.resolve(undefined);
      }),
    };
    (db.delete as ReturnType<typeof vi.fn>).mockReturnValue(deleteChain);

    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockImplementation(() => {
        callOrder.push('update');
        return Promise.resolve(undefined);
      }),
    };
    (db.update as ReturnType<typeof vi.fn>).mockReturnValue(updateChain);

    await POST();

    expect(callOrder).toEqual(['delete', 'update']);
  });

  it('passes correct userId to eq() for both delete and update', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-xyz');

    const deleteChain = {
      where: vi.fn().mockResolvedValue(undefined),
    };
    (db.delete as ReturnType<typeof vi.fn>).mockReturnValue(deleteChain);

    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(undefined),
    };
    (db.update as ReturnType<typeof vi.fn>).mockReturnValue(updateChain);

    await POST();

    const { eq } = await import('drizzle-orm');
    // eq should be called with userId for both delete and update
    expect(eq).toHaveBeenCalledWith('user_id', 'user-xyz');
    expect(eq).toHaveBeenCalledWith('clerk_id', 'user-xyz');
  });

  it('response has application/json content type', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const deleteChain = { where: vi.fn().mockResolvedValue(undefined) };
    (db.delete as ReturnType<typeof vi.fn>).mockReturnValue(deleteChain);
    const updateChain = { set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue(undefined) };
    (db.update as ReturnType<typeof vi.fn>).mockReturnValue(updateChain);

    const res = await POST();
    expect(res.headers.get('content-type')).toContain('application/json');
  });

  it('does not call db.update when db.delete throws', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const deleteChain = { where: vi.fn().mockRejectedValue(new Error('fail')) };
    (db.delete as ReturnType<typeof vi.fn>).mockReturnValue(deleteChain);

    await POST();

    expect(db.update).not.toHaveBeenCalled();
  });

  it('returns 401 with error message when not authorized', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await POST();
    const json = await res.json();

    expect(json.error).toBeDefined();
    expect(json.error.message).toBeTruthy();
  });

  it('sets stravaVerified to exactly false (not null)', async () => {
    (getAuthUserId as ReturnType<typeof vi.fn>).mockResolvedValue('user-abc');

    const deleteChain = { where: vi.fn().mockResolvedValue(undefined) };
    (db.delete as ReturnType<typeof vi.fn>).mockReturnValue(deleteChain);
    const updateChain = { set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue(undefined) };
    (db.update as ReturnType<typeof vi.fn>).mockReturnValue(updateChain);

    await POST();

    const setCall = updateChain.set.mock.calls[0][0];
    expect(setCall.stravaVerified).toBe(false);
    expect(setCall.stravaVerified).not.toBeNull();
  });
});
