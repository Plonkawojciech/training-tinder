import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  getSportLabel,
  getSportColor,
  getMatchScoreColor,
  getMatchScoreClass,
  formatRelativeTime,
  formatPace,
  formatPaceMin,
  haversineDistance,
  epley1RM,
  paceSecToMinKm,
  paceSecToKmh,
  kmhToPaceSec,
  minKmToPaceSec,
  SPORTS,
  GYM_SPORTS,
} from '@/lib/utils';

describe('getSportLabel', () => {
  it('returns Polish label for known sports', () => {
    expect(getSportLabel('cycling')).toBe('Kolarstwo');
    expect(getSportLabel('running')).toBe('Bieganie');
    expect(getSportLabel('swimming')).toBe('Pływanie');
    expect(getSportLabel('gym')).toBe('Siłownia');
    expect(getSportLabel('boxing')).toBe('Boks');
  });

  it('returns the raw value for unknown sports', () => {
    expect(getSportLabel('unknown_sport')).toBe('unknown_sport');
    expect(getSportLabel('')).toBe('');
  });

  it('returns English labels when lang=en', () => {
    expect(getSportLabel('cycling', 'en')).toBe('Cycling');
    expect(getSportLabel('running', 'en')).toBe('Running');
    expect(getSportLabel('swimming', 'en')).toBe('Swimming');
    expect(getSportLabel('gym', 'en')).toBe('Gym');
    expect(getSportLabel('boxing', 'en')).toBe('Boxing');
  });

  it('falls back to Polish for unknown lang', () => {
    expect(getSportLabel('cycling', 'de')).toBe('Kolarstwo');
  });
});

describe('getSportColor', () => {
  it('returns hex color for known sports', () => {
    expect(getSportColor('cycling')).toBe('#7C3AED');
    expect(getSportColor('running')).toBe('#00D4FF');
  });

  it('returns fallback color for unknown sport', () => {
    expect(getSportColor('curling')).toBe('#888888');
  });
});

describe('getMatchScoreColor / getMatchScoreClass', () => {
  it('returns green for high scores', () => {
    expect(getMatchScoreColor(70)).toBe('#00CC44');
    expect(getMatchScoreColor(100)).toBe('#00CC44');
    expect(getMatchScoreClass(85)).toBe('match-score-high');
  });

  it('returns gold for medium scores', () => {
    expect(getMatchScoreColor(40)).toBe('#FFD700');
    expect(getMatchScoreColor(69)).toBe('#FFD700');
    expect(getMatchScoreClass(50)).toBe('match-score-medium');
  });

  it('returns purple for low scores', () => {
    expect(getMatchScoreColor(39)).toBe('#7C3AED');
    expect(getMatchScoreColor(0)).toBe('#7C3AED');
    expect(getMatchScoreClass(10)).toBe('match-score-low');
  });
});

describe('formatRelativeTime', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns Polish "przed chwilą" by default for very recent dates', () => {
    const now = new Date();
    expect(formatRelativeTime(now)).toBe('przed chwilą');
  });

  it('returns Polish minutes format by default', () => {
    vi.useFakeTimers();
    const base = new Date('2026-01-01T12:00:00Z');
    vi.setSystemTime(base);
    const fiveMinAgo = new Date('2026-01-01T11:55:00Z');
    expect(formatRelativeTime(fiveMinAgo)).toBe('5 min temu');
    vi.useRealTimers();
  });

  it('returns Polish hours format by default', () => {
    vi.useFakeTimers();
    const base = new Date('2026-01-01T15:00:00Z');
    vi.setSystemTime(base);
    const threeHoursAgo = new Date('2026-01-01T12:00:00Z');
    expect(formatRelativeTime(threeHoursAgo)).toBe('3 godz. temu');
    vi.useRealTimers();
  });

  it('returns Polish days format by default', () => {
    vi.useFakeTimers();
    const base = new Date('2026-01-05T12:00:00Z');
    vi.setSystemTime(base);
    const twoDaysAgo = new Date('2026-01-03T12:00:00Z');
    expect(formatRelativeTime(twoDaysAgo)).toBe('2 dn. temu');
    vi.useRealTimers();
  });

  it('returns English "just now" when lang=en', () => {
    const now = new Date();
    expect(formatRelativeTime(now, 'en')).toBe('just now');
  });

  it('returns English minutes format when lang=en', () => {
    vi.useFakeTimers();
    const base = new Date('2026-01-01T12:00:00Z');
    vi.setSystemTime(base);
    const fiveMinAgo = new Date('2026-01-01T11:55:00Z');
    expect(formatRelativeTime(fiveMinAgo, 'en')).toBe('5m ago');
    vi.useRealTimers();
  });

  it('returns English hours format when lang=en', () => {
    vi.useFakeTimers();
    const base = new Date('2026-01-01T15:00:00Z');
    vi.setSystemTime(base);
    const threeHoursAgo = new Date('2026-01-01T12:00:00Z');
    expect(formatRelativeTime(threeHoursAgo, 'en')).toBe('3h ago');
    vi.useRealTimers();
  });

  it('accepts string dates', () => {
    const result = formatRelativeTime(new Date().toISOString());
    expect(result).toBe('przed chwilą');
  });
});

describe('formatPace', () => {
  it('formats pace correctly', () => {
    expect(formatPace(300)).toBe('5:00 /km');
    expect(formatPace(270)).toBe('4:30 /km');
  });

  it('returns --:-- for invalid values', () => {
    expect(formatPace(0)).toBe('--:--');
    expect(formatPace(-1)).toBe('--:--');
  });
});

describe('formatPaceMin', () => {
  it('formats pace without /km suffix', () => {
    expect(formatPaceMin(300)).toBe('5:00');
    expect(formatPaceMin(330)).toBe('5:30');
  });

  it('returns --:-- for invalid values', () => {
    expect(formatPaceMin(0)).toBe('--:--');
  });
});

describe('haversineDistance', () => {
  it('returns 0 for same point', () => {
    expect(haversineDistance(52.23, 21.01, 52.23, 21.01)).toBe(0);
  });

  it('computes approximate distance Warsaw-Krakow (~250-300 km)', () => {
    const d = haversineDistance(52.2297, 21.0122, 50.0647, 19.9450);
    expect(d).toBeGreaterThan(250);
    expect(d).toBeLessThan(310);
  });
});

describe('epley1RM', () => {
  it('returns weight for 1 rep', () => {
    expect(epley1RM(100, 1)).toBe(100);
  });

  it('estimates 1RM from multiple reps', () => {
    // 100kg x 5 reps => 100 * (1 + 5/30) = 100 * 1.167 ≈ 117
    expect(epley1RM(100, 5)).toBe(117);
  });

  it('estimates 1RM from 10 reps', () => {
    // 80kg x 10 reps => 80 * (1 + 10/30) = 80 * 1.333 ≈ 107
    expect(epley1RM(80, 10)).toBe(107);
  });
});

describe('pace conversions', () => {
  it('paceSecToMinKm', () => {
    expect(paceSecToMinKm(300)).toBe('5:00');
    expect(paceSecToMinKm(270)).toBe('4:30');
    expect(paceSecToMinKm(315)).toBe('5:15');
  });

  it('paceSecToKmh', () => {
    // 300 sec/km => 3600/300 = 12.0 km/h
    expect(paceSecToKmh(300)).toBe(12);
    // 240 sec/km => 3600/240 = 15.0 km/h
    expect(paceSecToKmh(240)).toBe(15);
  });

  it('kmhToPaceSec', () => {
    // 12 km/h => 3600/12 = 300 sec/km
    expect(kmhToPaceSec(12)).toBe(300);
    // 15 km/h => 3600/15 = 240 sec/km
    expect(kmhToPaceSec(15)).toBe(240);
  });

  it('minKmToPaceSec', () => {
    expect(minKmToPaceSec('5:00')).toBe(300);
    expect(minKmToPaceSec('4:30')).toBe(270);
    expect(minKmToPaceSec('6:15')).toBe(375);
  });
});

describe('SPORTS constant', () => {
  it('has cycling, running, gym as first 3', () => {
    expect(SPORTS[0].value).toBe('cycling');
    expect(SPORTS[1].value).toBe('running');
    expect(SPORTS[2].value).toBe('gym');
  });

  it('has at least 15 sports', () => {
    expect(SPORTS.length).toBeGreaterThanOrEqual(15);
  });
});

describe('GYM_SPORTS constant', () => {
  it('includes gym and powerlifting', () => {
    expect(GYM_SPORTS).toContain('gym');
    expect(GYM_SPORTS).toContain('powerlifting');
    expect(GYM_SPORTS).toContain('crossfit');
  });

  it('does not include endurance sports', () => {
    expect(GYM_SPORTS).not.toContain('cycling');
    expect(GYM_SPORTS).not.toContain('running');
    expect(GYM_SPORTS).not.toContain('swimming');
  });
});
