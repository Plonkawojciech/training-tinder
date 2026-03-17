/**
 * Simple in-memory rate limiter.
 * Works per serverless instance — sufficient for abuse prevention on small-scale apps.
 * For multi-instance production: swap with Redis-backed solution.
 */

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * Returns true if the request should be blocked.
 * @param key     - unique key, e.g. `login:1.2.3.4`
 * @param limit   - max requests per window
 * @param windowMs - window duration in ms
 */
export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  entry.count += 1;
  if (entry.count > limit) return true;
  return false;
}

/** Extract a stable IP string from a Next.js Request. Falls back to 'unknown'. */
export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );
}
