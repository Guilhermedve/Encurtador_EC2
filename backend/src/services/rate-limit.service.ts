export interface RateLimitDecision {
  allowed: boolean
  limit: number
  remaining: number
  resetAfterSeconds: number
}

export interface RateLimiter {
  consume(key: string): RateLimitDecision
}

export interface InMemoryRateLimiterOptions {
  maxRequests: number
  windowMs: number
  now?: () => number
}

interface RateLimitEntry {
  count: number
  resetAt: number
}

export class InMemoryRateLimiter implements RateLimiter {
  private readonly entries = new Map<string, RateLimitEntry>()
  private readonly now: () => number
  private nextCleanupAt = 0

  constructor(private readonly options: InMemoryRateLimiterOptions) {
    this.now = options.now ?? Date.now
  }

  get entryCount(): number {
    return this.entries.size
  }

  consume(key: string): RateLimitDecision {
    const now = this.now()
    this.cleanupIfDue(now)

    const current = this.entries.get(key)
    const entry =
      current && current.resetAt > now
        ? current
        : { count: 0, resetAt: now + this.options.windowMs }

    if (entry.count >= this.options.maxRequests) {
      return this.decision(false, 0, entry.resetAt, now)
    }

    entry.count += 1
    this.entries.set(key, entry)

    return this.decision(
      true,
      this.options.maxRequests - entry.count,
      entry.resetAt,
      now,
    )
  }

  private decision(
    allowed: boolean,
    remaining: number,
    resetAt: number,
    now: number,
  ): RateLimitDecision {
    return {
      allowed,
      limit: this.options.maxRequests,
      remaining,
      resetAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1_000)),
    }
  }

  private cleanupIfDue(now: number): void {
    if (now < this.nextCleanupAt) {
      return
    }

    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= now) {
        this.entries.delete(key)
      }
    }

    this.nextCleanupAt = now + this.options.windowMs
  }
}
