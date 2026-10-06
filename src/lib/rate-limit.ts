// Generic in-memory sliding-window rate limiter keyed by an arbitrary string
// (typically the client IP). Shared by login throttling and other endpoints
// that need failure throttling without an external dependency.
//
// Semantics: every check() records one attempt for its key. Once a key has
// more than `max` attempts inside the window, further checks are blocked and
// report how long until the oldest attempt ages out. Blocked attempts count
// too, so sustained hammering stays blocked until the key goes quiet for a
// full window. Expired buckets are swept periodically so idle keys do not
// accumulate (memory-leak protection).

export type SlidingWindowRateLimiterOptions = {
  /** Width of the counting window in milliseconds. */
  windowMs: number;
  /** Maximum number of allowed checks per key within the window. */
  max: number;
};

export type RateLimitResult = {
  allowed: boolean;
  /** Seconds until the next attempt can be allowed; 0 when allowed. */
  retryAfterSeconds: number;
};

// Shared per-client keying for rate limiters: trust the reverse proxy's
// forwarded-for header when present (first entry), otherwise bucket every
// direct client together under "unknown". Used by the login throttle and
// the public ai/chat limiter alike.
export function getClientKeyFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

export class SlidingWindowRateLimiter {
  private readonly windowMs: number;
  private readonly max: number;
  private readonly buckets = new Map<string, number[]>();
  private lastSweptAt = 0;

  constructor(options: SlidingWindowRateLimiterOptions) {
    this.windowMs = options.windowMs;
    this.max = options.max;
  }

  /** Record one attempt for `key` and decide whether it is allowed. */
  check(key: string, now: number = Date.now()): RateLimitResult {
    const fresh = (this.buckets.get(key) ?? []).filter(
      (timestamp) => now - timestamp < this.windowMs
    );
    fresh.push(now);

    if (fresh.length > this.max) {
      const oldest = fresh[0];
      const retryAfterMs = oldest + this.windowMs - now;
      const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
      // Bound memory under retry storms: keep only the newest entries, the
      // key stays blocked either way while attempts keep arriving.
      fresh.splice(0, fresh.length - this.max);
      this.buckets.set(key, fresh);
      return { allowed: false, retryAfterSeconds };
    }

    this.buckets.set(key, fresh);
    this.sweepExpiredBuckets(now);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  /** Drop recorded attempts: one key, or every key when omitted. */
  reset(key?: string): void {
    if (key === undefined) {
      this.buckets.clear();
    } else {
      this.buckets.delete(key);
    }
  }

  /** Number of keys currently tracked (diagnostics). */
  get size(): number {
    return this.buckets.size;
  }

  private sweepExpiredBuckets(now: number): void {
    if (now - this.lastSweptAt < this.windowMs) return;
    this.lastSweptAt = now;

    for (const [key, timestamps] of this.buckets) {
      const fresh = timestamps.filter(
        (timestamp) => now - timestamp < this.windowMs
      );
      if (fresh.length === 0) {
        this.buckets.delete(key);
      } else {
        this.buckets.set(key, fresh);
      }
    }
  }
}
