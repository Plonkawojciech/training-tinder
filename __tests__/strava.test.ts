import { describe, it, expect, vi } from 'vitest';

// Mock the DB module before importing strava (strava imports db at module level)
vi.mock('@/lib/db', () => ({
  db: {},
}));

const { BEST_EFFORT_DISTANCES } = await import('@/lib/strava');

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
