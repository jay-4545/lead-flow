const BLOCKED_REDIRECT_PROTOCOLS = /^(javascript|data|vbscript|file):/i

export function isSafeRedirectUrl(url: string): boolean {
  if (!url || url.startsWith("//")) return false
  if (BLOCKED_REDIRECT_PROTOCOLS.test(url.trim())) return false

  try {
    const parsed = new URL(url)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return url.startsWith("/") && !url.startsWith("//")
  }
}

export function getSafeRedirectUrl(url: string | null, fallback = "/"): string {
  if (!url) return fallback
  const decoded = decodeURIComponent(url)
  return isSafeRedirectUrl(decoded) ? decoded : fallback
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown"
  return request.headers.get("x-real-ip") ?? "unknown"
}
