type Bucket = {
  timestamps: number[];
};

export type RateLimitDecision = {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
};

export class SlidingWindowRateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly now: () => number = () => Date.now()) {}

  check(key: string, limit: number, windowMs: number): RateLimitDecision {
    const current = this.now();
    const bucket = this.buckets.get(key) ?? { timestamps: [] };
    const fresh = bucket.timestamps.filter((timestamp) => current - timestamp < windowMs);

    if (fresh.length >= limit) {
      const oldest = fresh[0] ?? current;
      const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (current - oldest)) / 1000));
      this.buckets.set(key, { timestamps: fresh });
      return { allowed: false, retryAfterSeconds, remaining: 0 };
    }

    fresh.push(current);
    this.buckets.set(key, { timestamps: fresh });
    return { allowed: true, retryAfterSeconds: 0, remaining: Math.max(0, limit - fresh.length) };
  }

  reset(): void {
    this.buckets.clear();
  }
}

export const apiRateLimiter = new SlidingWindowRateLimiter();
