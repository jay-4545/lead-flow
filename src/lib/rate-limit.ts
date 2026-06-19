import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

export type RateLimitTier =
  | "auth"
  | "ai"
  | "import"
  | "track"
  | "api"

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim()
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  if (!url || !token) return null
  if (
    url.includes("your-redis") ||
    token.includes("your-upstash") ||
    !url.startsWith("https://")
  ) {
    return null
  }
  return new Redis({ url, token })
}

const redis = getRedis()

const limiters: Record<RateLimitTier, Ratelimit | null> = {
  auth: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "15 m"),
        prefix: "rl:auth",
      })
    : null,
  ai: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "1 h"),
        prefix: "rl:ai",
      })
    : null,
  import: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(3, "1 h"),
        prefix: "rl:import",
      })
    : null,
  track: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(60, "1 m"),
        prefix: "rl:track",
      })
    : null,
  api: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, "1 m"),
        prefix: "rl:api",
      })
    : null,
}

export function getRateLimitTier(pathname: string): RateLimitTier | null {
  if (pathname.startsWith("/api/register") || pathname.startsWith("/api/auth")) {
    return "auth"
  }
  if (
    pathname.startsWith("/api/leads/enrich") ||
    pathname.startsWith("/api/emails/generate")
  ) {
    return "ai"
  }
  if (pathname.startsWith("/api/leads/import")) {
    return "import"
  }
  if (pathname.startsWith("/api/emails/track") || pathname.startsWith("/api/emails/unsubscribe")) {
    return "track"
  }
  if (pathname.startsWith("/api/cron")) {
    return null
  }
  if (pathname.startsWith("/api/")) {
    return "api"
  }
  return null
}

export async function checkRateLimit(
  tier: RateLimitTier,
  identifier: string
): Promise<{ success: boolean; limit?: number; remaining?: number; reset?: number }> {
  const limiter = limiters[tier]
  if (!limiter) return { success: true }

  try {
    const result = await limiter.limit(identifier)
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    }
  } catch (error) {
    console.error("Rate limit check failed, allowing request:", error)
    return { success: true }
  }
}

export function rateLimitHeaders(result: {
  limit?: number
  remaining?: number
  reset?: number
}): Record<string, string> {
  const headers: Record<string, string> = {}
  if (result.limit !== undefined) headers["X-RateLimit-Limit"] = String(result.limit)
  if (result.remaining !== undefined) {
    headers["X-RateLimit-Remaining"] = String(result.remaining)
  }
  if (result.reset !== undefined) headers["X-RateLimit-Reset"] = String(result.reset)
  return headers
}
