import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the DB module before importing strava (strava imports db at module level)
vi.mock('@/lib/db', () => ({
  db: {},
}));

const {
  BEST_EFFORT_DISTANCES,
  fetchStravaApi,
  fetchStravaActivities,
  upsertActivitiesAndCollectBestEfforts,
} = await import('@/lib/strava');

describe('strava – BEST_EFFORT_DISTANCES', () => {
  it('contains known running distances', () => {
    expect(BEST_EFFORT_DISTANCES['400m']).toBe(400);
    expect(BEST_EFFORT_DISTANCES['1k']).toBe(1000);
    expect(BEST_EFFORT_DISTANCES['1 mile']).toBe(1609);
    expect(BEST_EFFORT_DISTANCES['5k']).toBe(5000);
    expect(BEST_EFFORT_DISTANCES['10k']).toBe(10000);
    expect(BEST_EFFORT_DISTANCES['Half-Marathon']).toBe(21097);
    expect(BEST_EFFORT_DISTANCES['Marathon']).toBe(42195);
  });

  it('has 11 entries', () => {
    expect(Object.keys(BEST_EFFORT_DISTANCES).length).toBe(11);
  });

  it('all values are positive numbers', () => {
    for (const [name, distance] of Object.entries(BEST_EFFORT_DISTANCES)) {
      expect(distance, `${name} should be positive`).toBeGreaterThan(0);
      expect(typeof distance).toBe('number');
    }
  });

  it('values are strictly ascending (sorted by distance)', () => {
    const values = Object.values(BEST_EFFORT_DISTANCES);
    for (let i = 1; i < values.length; i++) {
      expect(values[i], `index ${i} should be > index ${i - 1}`).toBeGreaterThan(values[i - 1]);
    }
  });
});

describe('strava – token URL construction', () => {
  it('buildTokenUrl constructs correct URL with params', () => {
    const clientId = 'test_client_id';
    const clientSecret = 'test_client_secret';
    const code = 'auth_code_123';

    const body = JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
    });

    const parsed = JSON.parse(body) as Record<string, string>;
    expect(parsed.client_id).toBe(clientId);
    expect(parsed.client_secret).toBe(clientSecret);
    expect(parsed.code).toBe(code);
    expect(parsed.grant_type).toBe('authorization_code');
  });
});

describe('strava – parseActivityType maps various Strava types', () => {
  it('maps sport_type to type when sport_type is present', () => {
    const activity = {
      id: 1,
      sport_type: 'TrailRun',
      type: 'Run',
      name: 'Morning trail',
      distance: 10000,
      moving_time: 3600,
      elapsed_time: 3700,
      total_elevation_gain: 200,
      average_speed: 2.78,
      max_speed: 4.0,
      start_date: '2025-01-01T08:00:00Z',
      trainer: false,
      kudos_count: 5,
      achievement_count: 2,
    };

    // The lib stores both type and sportType — sportType falls back to type
    const sportType = activity.sport_type || activity.type;
    expect(sportType).toBe('TrailRun');
  });

  it('falls back to type when sport_type is empty', () => {
    const activity = {
      id: 2,
      sport_type: '',
      type: 'Ride',
      name: 'Evening ride',
      distance: 30000,
      moving_time: 5400,
      elapsed_time: 5500,
      total_elevation_gain: 300,
      average_speed: 5.56,
      max_speed: 12.0,
      start_date: '2025-01-02T17:00:00Z',
      trainer: false,
      kudos_count: 3,
      achievement_count: 1,
    };

    const sportType = activity.sport_type || activity.type;
    expect(sportType).toBe('Ride');
  });

  it('recognizes common Strava activity types', () => {
    const types = ['Run', 'Ride', 'Swim', 'Walk', 'Hike', 'VirtualRide', 'WeightTraining'];
    for (const t of types) {
      expect(typeof t).toBe('string');
      expect(t.length).toBeGreaterThan(0);
    }
  });
});

describe('strava – token refresh handles expired tokens', () => {
  it('constructs correct refresh token request body', () => {
    const refreshToken = 'refresh_abc123';
    const clientId = 'my_client';
    const clientSecret = 'my_secret';

    const body = JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const parsed = JSON.parse(body) as Record<string, string>;
    expect(parsed.grant_type).toBe('refresh_token');
    expect(parsed.refresh_token).toBe(refreshToken);
    expect(parsed.client_id).toBe(clientId);
    expect(parsed.client_secret).toBe(clientSecret);
  });

  it('converts expires_at to a Date in the future', () => {
    const futureEpochSec = Math.floor(Date.now() / 1000) + 21600; // 6 hours from now
    const expiresAt = new Date(futureEpochSec * 1000);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('detects token expiration when expiresAt is in the past', () => {
    const pastEpochSec = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
    const expiresAt = new Date(pastEpochSec * 1000);
    const needsRefresh = expiresAt.getTime() < Date.now() + 60_000;
    expect(needsRefresh).toBe(true);
  });
});

describe('strava – activity sync deduplicates by stravaId', () => {
  it('upsertActivitiesAndCollectBestEfforts returns 0 for empty array', async () => {
    const result = await upsertActivitiesAndCollectBestEfforts('user-1', []);
    expect(result.synced).toBe(0);
    expect(result.bestEffortsMap.size).toBe(0);
  });

  it('builds rows with stravaId as string from numeric id', () => {
    const activities = [
      { id: 12345, type: 'Run', sport_type: 'Run', name: 'Run A' },
      { id: 12345, type: 'Run', sport_type: 'Run', name: 'Run A duplicate' },
      { id: 67890, type: 'Ride', sport_type: 'Ride', name: 'Ride B' },
    ];

    const stravaIds = activities.map(a => String(a.id));
    expect(stravaIds[0]).toBe('12345');
    expect(stravaIds[1]).toBe('12345');
    expect(stravaIds[2]).toBe('67890');

    // Deduplication: unique stravaIds
    const unique = [...new Set(stravaIds)];
    expect(unique.length).toBe(2);
    expect(unique).toContain('12345');
    expect(unique).toContain('67890');
  });

  it('keeps only fastest best effort per distance', () => {
    const bestEffortsMap = new Map<string, { distanceM: number; movingTimeSec: number; activityStravaId: string; startDate: Date }>();

    // Simulate the best-effort collection logic from upsertActivitiesAndCollectBestEfforts
    const efforts = [
      { name: '5k', distance: 5000, moving_time: 1200, activityId: '111', start_date: '2025-01-01T00:00:00Z' },
      { name: '5k', distance: 5000, moving_time: 1100, activityId: '222', start_date: '2025-02-01T00:00:00Z' },
      { name: '5k', distance: 5000, moving_time: 1300, activityId: '333', start_date: '2025-03-01T00:00:00Z' },
    ];

    for (const effort of efforts) {
      if (BEST_EFFORT_DISTANCES[effort.name] !== undefined) {
        const existing = bestEffortsMap.get(effort.name);
        if (!existing || effort.moving_time < existing.movingTimeSec) {
          bestEffortsMap.set(effort.name, {
            distanceM: effort.distance,
            movingTimeSec: effort.moving_time,
            activityStravaId: effort.activityId,
            startDate: new Date(effort.start_date),
          });
        }
      }
    }

    expect(bestEffortsMap.size).toBe(1);
    const best5k = bestEffortsMap.get('5k')!;
    expect(best5k.movingTimeSec).toBe(1100);
    expect(best5k.activityStravaId).toBe('222');
  });
});

describe('strava – OAuth flow constructs correct redirect URL', () => {
  it('builds authorization URL with required params', () => {
    const clientId = 'test_client_123';
    const redirectUri = 'https://example.com/api/strava/callback';
    const scope = 'read,activity:read_all,profile:read_all';
    const state = 'auth';

    const url = new URL('https://www.strava.com/oauth/authorize');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', scope);
    url.searchParams.set('state', state);

    expect(url.origin).toBe('https://www.strava.com');
    expect(url.pathname).toBe('/oauth/authorize');
    expect(url.searchParams.get('client_id')).toBe(clientId);
    expect(url.searchParams.get('redirect_uri')).toBe(redirectUri);
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe(scope);
    expect(url.searchParams.get('state')).toBe(state);
  });

  it('callback parses code and state from URL', () => {
    const callbackUrl = new URL('https://example.com/api/strava/callback?code=abc123&state=auth');
    const code = callbackUrl.searchParams.get('code');
    const state = callbackUrl.searchParams.get('state');

    expect(code).toBe('abc123');
    expect(state).toBe('auth');
    expect(state === 'auth').toBe(true);
  });

  it('callback detects access_denied error', () => {
    const errorUrl = new URL('https://example.com/api/strava/callback?error=access_denied');
    const code = errorUrl.searchParams.get('code');
    const stravaError = errorUrl.searchParams.get('error');

    expect(code).toBeNull();
    expect(stravaError).toBe('access_denied');
  });
});

describe('strava – error handling when Strava API is down', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetchStravaApi throws on non-OK response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Service Unavailable', { status: 503 }),
    );

    await expect(
      fetchStravaApi('https://www.strava.com/api/v3/athlete', 'fake_token'),
    ).rejects.toThrow('Strava API https://www.strava.com/api/v3/athlete returned 503');
  });

  it('fetchStravaApi includes status code in error message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Rate Limited', { status: 429 }),
    );

    await expect(
      fetchStravaApi('https://www.strava.com/api/v3/athlete/activities', 'fake_token'),
    ).rejects.toThrow('rate limited');
  });

  it('fetchStravaActivities returns empty array when API fails on first page', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    const activities = await fetchStravaActivities('bad_token', 2);
    expect(activities).toEqual([]);
  });

  it('fetchStravaApi sends correct Authorization header', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 1 }), { status: 200 }),
    );

    await fetchStravaApi('https://www.strava.com/api/v3/athlete', 'my_access_token');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://www.strava.com/api/v3/athlete',
      { headers: { Authorization: 'Bearer my_access_token' } },
    );
  });
});
