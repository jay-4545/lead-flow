import { timingSafeEqual } from "crypto"

export { getClientIp, getSafeRedirectUrl, isSafeRedirectUrl } from "@/lib/security-edge"

export function verifyCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) return false

  const token = authHeader.slice(7)
  if (token.length !== secret.length) return false

  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(secret))
  } catch {
    return false
  }
}
