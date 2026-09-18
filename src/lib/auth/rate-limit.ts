import 'server-only'

interface Bucket {
  count: number
  resetAt: number
  blockedUntil: number
}

const buckets = new Map<string, Bucket>()

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

/**
 * Fixed-window limiter with a lockout, kept in process memory.
 *
 * Good enough for a single-instance internal tool; behind multiple instances,
 * swap this for Redis or Supabase-backed counters (see README).
 */
export function rateLimit(
  key: string,
  { limit, windowSeconds, blockSeconds = windowSeconds }: { limit: number; windowSeconds: number; blockSeconds?: number },
): RateLimitResult {
  const nowMs = Date.now()
  const bucket = buckets.get(key)

  if (bucket && bucket.blockedUntil > nowMs) {
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.ceil((bucket.blockedUntil - nowMs) / 1000) }
  }

  if (!bucket || bucket.resetAt <= nowMs) {
    buckets.set(key, { count: 1, resetAt: nowMs + windowSeconds * 1000, blockedUntil: 0 })
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 }
  }

  bucket.count += 1
  if (bucket.count > limit) {
    bucket.blockedUntil = nowMs + blockSeconds * 1000
    return { allowed: false, remaining: 0, retryAfterSeconds: blockSeconds }
  }
  return { allowed: true, remaining: limit - bucket.count, retryAfterSeconds: 0 }
}

export function resetRateLimit(key: string): void {
  buckets.delete(key)
}

/** Best-effort client identity for throttling. Never used for authorisation. */
export function clientKey(headers: Headers, suffix = ''): string {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = forwarded || headers.get('x-real-ip') || 'unknown'
  return `${ip}:${suffix}`
}
