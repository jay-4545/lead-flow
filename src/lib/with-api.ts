import { NextResponse } from "next/server"
import type { Session } from "next-auth"
import { auth } from "@/lib/auth"
import { apiError } from "@/lib/api"
import {
  checkRateLimit,
  getRateLimitTier,
  rateLimitHeaders,
  type RateLimitTier,
} from "@/lib/rate-limit"
import { getClientIp } from "@/lib/security-edge"

type ApiHandler = (
  request: Request,
  context: { session: Session; userId: string; params?: Record<string, string> }
) => Promise<Response>

type PublicApiHandler = (
  request: Request,
  context?: { params?: Record<string, string> }
) => Promise<Response>

function getRateLimitIdentifier(
  request: Request,
  tier: RateLimitTier,
  userId?: string
): string {
  if (tier === "api" || tier === "ai" || tier === "import") {
    return userId ?? getClientIp(request)
  }
  return getClientIp(request)
}

async function applyRateLimit(
  request: Request,
  tier: RateLimitTier,
  userId?: string
): Promise<Response | null> {
  const result = await checkRateLimit(tier, getRateLimitIdentifier(request, tier, userId))
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: rateLimitHeaders(result),
      }
    )
  }
  return null
}

export function withAuth(handler: ApiHandler, tierOverride?: RateLimitTier) {
  return async (request: Request, routeContext?: { params: Promise<Record<string, string>> }) => {
    const pathname = new URL(request.url).pathname
    const tier = tierOverride ?? getRateLimitTier(pathname) ?? "api"

    const session = await auth()
    if (!session?.user?.id) return apiError("Unauthorized", 401)

    const rateLimited = await applyRateLimit(request, tier, session.user.id)
    if (rateLimited) return rateLimited

    const params = routeContext?.params ? await routeContext.params : undefined
    return handler(request, { session, userId: session.user.id, params })
  }
}

export function withPublic(handler: PublicApiHandler, tierOverride?: RateLimitTier) {
  return async (request: Request, routeContext?: { params: Promise<Record<string, string>> }) => {
    const pathname = new URL(request.url).pathname
    const tier = tierOverride ?? getRateLimitTier(pathname) ?? "track"

    const rateLimited = await applyRateLimit(request, tier)
    if (rateLimited) return rateLimited

    const params = routeContext?.params ? await routeContext.params : undefined
    return handler(request, { params })
  }
}
