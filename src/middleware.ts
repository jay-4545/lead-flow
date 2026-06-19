import { NextResponse } from "next/server"
import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth.config"
import { checkRateLimit, getRateLimitTier, rateLimitHeaders } from "@/lib/rate-limit"
import { getClientIp } from "@/lib/security-edge"

const { auth } = NextAuth(authConfig)

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.NEXTAUTH_URL,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
].filter(Boolean) as string[]

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true
  return ALLOWED_ORIGINS.some((allowed) => origin === allowed)
}

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  }
  if (origin && isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin
    headers["Vary"] = "Origin"
  }
  return headers
}

export default auth(async function middleware(request) {
  const { pathname } = request.nextUrl
  const origin = request.headers.get("origin")

  if (pathname.startsWith("/api/")) {
    if (origin && !isAllowedOrigin(origin)) {
      return NextResponse.json(
        { success: false, error: "Origin not allowed" },
        { status: 403, headers: corsHeaders(null) }
      )
    }

    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: corsHeaders(origin) })
    }

    const tier = getRateLimitTier(pathname)
    if (tier) {
      try {
        const identifier = getClientIp(request)
        const result = await checkRateLimit(tier, identifier)
        if (!result.success) {
          return NextResponse.json(
            { success: false, error: "Too many requests. Please try again later." },
            {
              status: 429,
              headers: { ...corsHeaders(origin), ...rateLimitHeaders(result) },
            }
          )
        }
      } catch (error) {
        console.error("Middleware rate limit error:", error)
      }
    }

    const response = NextResponse.next()
    Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    return response
  }

  return undefined
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
