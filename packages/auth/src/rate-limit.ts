export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

type Bucket = { count: number; resetAt: number };

/**
 * In-process token bucket. Suitable for single-instance / local.
 * At multi-instance scale, swap for Redis-backed RateLimiter (same interface).
 */
export class MemoryRateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly options: {
      windowMs: number;
      max: number;
    },
  ) {}

  check(key: string, now = Date.now()): RateLimitResult {
    const existing = this.buckets.get(key);
    if (!existing || existing.resetAt <= now) {
      const resetAt = now + this.options.windowMs;
      this.buckets.set(key, { count: 1, resetAt });
      return {
        allowed: true,
        remaining: this.options.max - 1,
        resetAt,
      };
    }

    if (existing.count >= this.options.max) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: existing.resetAt,
      };
    }

    existing.count += 1;
    return {
      allowed: true,
      remaining: this.options.max - existing.count,
      resetAt: existing.resetAt,
    };
  }

  /** Test helper */
  clear(): void {
    this.buckets.clear();
  }
}

/** Shared limiters for admin mutating APIs and public read APIs. */
export const adminMutationLimiter = new MemoryRateLimiter({
  windowMs: 60_000,
  max: Number(process.env.RATE_LIMIT_ADMIN_MUTATION_PER_MIN ?? 60),
});

export const publicApiLimiter = new MemoryRateLimiter({
  windowMs: 60_000,
  max: Number(process.env.RATE_LIMIT_PUBLIC_PER_MIN ?? 120),
});

export function clientKey(request: Request, prefix: string): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "local";
  return `${prefix}:${ip}`;
}
