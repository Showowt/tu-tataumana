/**
 * Simple in-memory per-key rate limiter for public, unauthenticated write endpoints.
 *
 * Best-effort: state is per-serverless-instance and resets on cold start, so it
 * blunts floods/abuse/enumeration without external infra. For hard cross-instance
 * guarantees, back this with Upstash/Redis. Returns true when the caller is OVER
 * the limit (should be rejected with 429).
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit = 10, windowMs = 60_000): boolean {
  // Fail OPEN when the client IP couldn't be determined — otherwise every such
  // caller shares one bucket and legitimate users get throttled together (R2D-01).
  if (key.endsWith(":unknown")) return false;
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  entry.count += 1;

  // Opportunistic cleanup so the map can't grow unbounded.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (now > v.resetAt) buckets.delete(k);
    }
  }

  return entry.count > limit;
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}
