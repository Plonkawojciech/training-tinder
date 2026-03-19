import { describe, it, expect } from 'vitest';
import {
  calculateMatchScore,
  rankMatches,
  filterByLocation,
  filterBySport,
  type UserForMatching,
} from '@/lib/matching';

const baseUser: UserForMatching = {
  id: '1',
  authEmail: 'user-1@test.com',
  username: 'wojtek',
  avatarUrl: null,
  bio: null,
  sportTypes: ['cycling', 'running'],
  pacePerKm: 300,
  weeklyKm: 50,
  city: 'Warszawa',
  lat: 52.23,
  lon: 21.01,
  gymName: null,
  strengthLevel: null,
  trainingSplits: [],
  goals: [],
};

function makeCandidate(overrides: Partial<UserForMatching> = {}): UserForMatching {
  return {
    id: '2',
    authEmail: 'user-2@test.com',
    username: 'jan',
    avatarUrl: null,
    bio: null,
    sportTypes: [],
    pacePerKm: null,
    weeklyKm: null,
    city: null,
    lat: null,
    lon: null,
    gymName: null,
    strengthLevel: null,
    trainingSplits: [],
    goals: [],
    ...overrides,
  };
}

// --- calculateMatchScore ---

describe('calculateMatchScore', () => {
  it('gives 0 sportMatch when no sport overlap', () => {
    const candidate = makeCandidate({ sportTypes: ['swimming'] });
    const result = calculateMatchScore(baseUser, candidate);
    expect(result.breakdown.sportMatch).toBe(0);
  });

  it('gives 20 points for 1 shared sport', () => {
    const candidate = makeCandidate({ sportTypes: ['cycling'] });
    const result = calculateMatchScore(baseUser, candidate);
    expect(result.breakdown.sportMatch).toBe(20);
  });

  it('gives 40 points (capped) for 2+ shared sports', () => {
    const candidate = makeCandidate({ sportTypes: ['cycling', 'running', 'swimming'] });
    const result = calculateMatchScore(baseUser, candidate);
    expect(result.breakdown.sportMatch).toBe(40);
  });

  it('gives 30 pace points for <30s diff', () => {
    const candidate = makeCandidate({ pacePerKm: 310 });
    const result = calculateMatchScore(baseUser, candidate);
    expect(result.breakdown.paceMatch).toBe(30);
  });

  it('gives 20 pace points for 30-60s diff', () => {
    const candidate = makeCandidate({ pacePerKm: 350 });
    const result = calculateMatchScore(baseUser, candidate);
    expect(result.breakdown.paceMatch).toBe(20);
  });

  it('gives 10 pace points for 60-120s diff', () => {
    const candidate = makeCandidate({ pacePerKm: 400 });
    const result = calculateMatchScore(baseUser, candidate);
    expect(result.breakdown.paceMatch).toBe(10);
  });

  it('gives 0 pace points for >120s diff', () => {
    const candidate = makeCandidate({ pacePerKm: 500 });
    const result = calculateMatchScore(baseUser, candidate);
    expect(result.breakdown.paceMatch).toBe(0);
  });

  it('gives 20 location points for <2km distance', () => {
    const candidate = makeCandidate({ lat: 52.231, lon: 21.011 });
    const result = calculateMatchScore(baseUser, candidate);
    expect(result.breakdown.locationMatch).toBe(20);
  });

  it('gives 15 location points for 2-5km distance', () => {
    const candidate = makeCandidate({ lat: 52.26, lon: 21.01 });
    const result = calculateMatchScore(baseUser, candidate);
    expect(result.breakdown.locationMatch).toBe(15);
  });

  it('gives 10 location points for 5-10km distance', () => {
    const candidate = makeCandidate({ lat: 52.30, lon: 21.01 });
    const result = calculateMatchScore(baseUser, candidate);
    expect(result.breakdown.locationMatch).toBe(10);
  });

  it('gives 5 location points for 10-25km distance', () => {
    const candidate = makeCandidate({ lat: 52.40, lon: 21.01 });
    const result = calculateMatchScore(baseUser, candidate);
    expect(result.breakdown.locationMatch).toBe(5);
  });

  it('gives 0 location points when candidate has no location', () => {
    const candidate = makeCandidate({ lat: null, lon: null });
    const result = calculateMatchScore(baseUser, candidate);
    expect(result.breakdown.locationMatch).toBe(0);
    expect(result.distanceKm).toBeNull();
  });

  it('gives 10 weeklyKm points for <20km diff', () => {
    const candidate = makeCandidate({ weeklyKm: 45 });
    const result = calculateMatchScore(baseUser, candidate);
    expect(result.breakdown.weeklyKmMatch).toBe(10);
  });

  it('gives 5 weeklyKm points for 20-50km diff', () => {
    const candidate = makeCandidate({ weeklyKm: 20 });
    const result = calculateMatchScore(baseUser, candidate);
    expect(result.breakdown.weeklyKmMatch).toBe(5);
  });

  it('gives 15 gym match for same gym (case-insensitive)', () => {
    const user = { ...baseUser, gymName: 'CityFit Mokotów' };
    const candidate = makeCandidate({ gymName: 'cityfit mokotów' });
    const result = calculateMatchScore(user, candidate);
    expect(result.breakdown.gymMatch).toBe(15);
  });

  it('gives 10 split match for overlapping training splits', () => {
    const user = { ...baseUser, trainingSplits: ['push', 'pull'] };
    const candidate = makeCandidate({ trainingSplits: ['pull', 'legs'] });
    const result = calculateMatchScore(user, candidate);
    expect(result.breakdown.splitMatch).toBe(10);
  });

  it('gives 10 strength match for same level', () => {
    const user = { ...baseUser, strengthLevel: 'intermediate' };
    const candidate = makeCandidate({ strengthLevel: 'intermediate' });
    const result = calculateMatchScore(user, candidate);
    expect(result.breakdown.strengthMatch).toBe(10);
  });

  it('gives goal points (5 per shared, max 20)', () => {
    const user = { ...baseUser, goals: ['marathon', 'weight_loss', 'speed', 'endurance', 'strength'] };
    const candidate = makeCandidate({ goals: ['marathon', 'speed', 'endurance', 'strength', 'flexibility'] });
    const result = calculateMatchScore(user, candidate);
    expect(result.breakdown.goalMatch).toBe(20);
  });

  it('caps total score at 100', () => {
    const user: UserForMatching = {
      ...baseUser,
      gymName: 'CityFit',
      trainingSplits: ['push'],
      strengthLevel: 'advanced',
      goals: ['marathon', 'speed', 'endurance', 'strength'],
    };
    const candidate = makeCandidate({
      sportTypes: ['cycling', 'running'],
      pacePerKm: 300,
      weeklyKm: 50,
      lat: 52.231,
      lon: 21.011,
      gymName: 'CityFit',
      trainingSplits: ['push'],
      strengthLevel: 'advanced',
      goals: ['marathon', 'speed', 'endurance', 'strength'],
      username: 'jan',
      bio: 'Bio',
      city: 'Warszawa',
      avatarUrl: 'http://avatar',
      availability: ['morning'],
    });
    const result = calculateMatchScore(user, candidate);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('gives profile completion bonus', () => {
    const candidate = makeCandidate({
      username: 'jan',
      bio: 'I love running',
      sportTypes: ['running'],
      pacePerKm: 300,
      weeklyKm: 40,
      city: 'Kraków',
      avatarUrl: 'http://avatar.jpg',
      goals: ['marathon'],
      availability: ['morning'],
    });
    const result = calculateMatchScore(baseUser, candidate);
    expect(result.breakdown.profileCompletion).toBeGreaterThan(0);
    expect(result.breakdown.profileCompletion).toBeLessThanOrEqual(20);
  });
});

// --- rankMatches ---

describe('rankMatches', () => {
  it('sorts candidates by score descending', () => {
    const c1 = makeCandidate({ id: '2', authEmail: 'a@test.com', sportTypes: ['cycling'] });
    const c2 = makeCandidate({ id: '3', authEmail: 'b@test.com', sportTypes: ['cycling', 'running'] });
    const results = rankMatches(baseUser, [c1, c2]);
    expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
  });

  it('excludes current user from candidates', () => {
    const self = makeCandidate({ id: '1', authEmail: 'user-1@test.com' });
    const other = makeCandidate({ id: '2', authEmail: 'other@test.com' });
    const results = rankMatches(baseUser, [self, other]);
    expect(results).toHaveLength(1);
    expect(results[0].user.authEmail).toBe('other@test.com');
  });
});

// --- filterByLocation ---

describe('filterByLocation', () => {
  it('keeps matches within maxDistance', () => {
    const matches = [
      { user: makeCandidate(), score: 80, breakdown: {} as ReturnType<typeof calculateMatchScore>['breakdown'], distanceKm: 5 },
      { user: makeCandidate({ id: '3' }), score: 70, breakdown: {} as ReturnType<typeof calculateMatchScore>['breakdown'], distanceKm: 15 },
    ];
    const filtered = filterByLocation(matches, 10);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].distanceKm).toBe(5);
  });

  it('includes matches with null distance (no location)', () => {
    const matches = [
      { user: makeCandidate(), score: 80, breakdown: {} as ReturnType<typeof calculateMatchScore>['breakdown'], distanceKm: null },
    ];
    const filtered = filterByLocation(matches, 10);
    expect(filtered).toHaveLength(1);
  });

  it('edge: distance exactly at maxDistance is included', () => {
    const matches = [
      { user: makeCandidate(), score: 80, breakdown: {} as ReturnType<typeof calculateMatchScore>['breakdown'], distanceKm: 50 },
    ];
    const filtered = filterByLocation(matches, 50);
    expect(filtered).toHaveLength(1);
  });
});

// --- filterBySport ---

describe('filterBySport', () => {
  it('filters by specific sport', () => {
    const matches = [
      { user: makeCandidate({ sportTypes: ['cycling'] }), score: 80, breakdown: {} as ReturnType<typeof calculateMatchScore>['breakdown'], distanceKm: null },
      { user: makeCandidate({ id: '3', sportTypes: ['running'] }), score: 70, breakdown: {} as ReturnType<typeof calculateMatchScore>['breakdown'], distanceKm: null },
    ];
    const filtered = filterBySport(matches, 'cycling');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].user.sportTypes).toContain('cycling');
  });

  it('returns all when sport is "all"', () => {
    const matches = [
      { user: makeCandidate({ sportTypes: ['cycling'] }), score: 80, breakdown: {} as ReturnType<typeof calculateMatchScore>['breakdown'], distanceKm: null },
      { user: makeCandidate({ id: '3', sportTypes: ['running'] }), score: 70, breakdown: {} as ReturnType<typeof calculateMatchScore>['breakdown'], distanceKm: null },
    ];
    const filtered = filterBySport(matches, 'all');
    expect(filtered).toHaveLength(2);
  });

  it('returns empty when no sport overlap', () => {
    const matches = [
      { user: makeCandidate({ sportTypes: ['swimming'] }), score: 80, breakdown: {} as ReturnType<typeof calculateMatchScore>['breakdown'], distanceKm: null },
    ];
    const filtered = filterBySport(matches, 'cycling');
    expect(filtered).toHaveLength(0);
  });
});
