import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isRateLimited } from '@/lib/rate-limit';

describe('rate-limit – isRateLimited', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows first request', () => {
    expect(isRateLimited('test:1', 5, 60_000)).toBe(false);
  });

  it('allows requests up to the limit', () => {
    const key = 'test:limit';
    for (let i = 0; i < 5; i++) {
      expect(isRateLimited(key, 5, 60_000)).toBe(false);
    }
  });

  it('blocks the request that exceeds the limit', () => {
    const key = 'test:exceed';
    // 5 allowed
    for (let i = 0; i < 5; i++) {
      isRateLimited(key, 5, 60_000);
    }
    // 6th should be blocked
    expect(isRateLimited(key, 5, 60_000)).toBe(true);
  });

  it('resets after the window expires', () => {
    const key = 'test:reset';
    // Exhaust the limit
    for (let i = 0; i < 5; i++) {
      isRateLimited(key, 5, 60_000);
    }
    expect(isRateLimited(key, 5, 60_000)).toBe(true);

    // Advance past the window
    vi.advanceTimersByTime(60_001);

    // Should be allowed again
    expect(isRateLimited(key, 5, 60_000)).toBe(false);
  });

  it('uses different counters for different keys', () => {
    const keyA = 'test:a';
    const keyB = 'test:b';

    // Exhaust keyA
    for (let i = 0; i < 3; i++) {
      isRateLimited(keyA, 3, 60_000);
    }
    expect(isRateLimited(keyA, 3, 60_000)).toBe(true);

    // keyB should still be fine
    expect(isRateLimited(keyB, 3, 60_000)).toBe(false);
  });
});
