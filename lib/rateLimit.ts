/**
 * Simple in-process rate limiter.
 * Good enough for a single-instance MVP. Replace with Redis INCR + EXPIRE
 * when scaling horizontally.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

/** Returns true if the request is allowed; false if rate limited. */
export function checkRateLimit(
  key: string,
  limit: number = Number(process.env.GENERATE_RATE_LIMIT ?? 10),
  windowMs: number = 60_000,
): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;

  entry.count += 1;
  return true;
}
