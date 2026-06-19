import { z } from "zod"
import { auth } from "@/lib/auth"
import { decryptSecret } from "@/lib/encryption"
import { testConnection } from "@/lib/mailer"
import { apiError, apiResponse } from "@/lib/api"

const testSchema = z.object({
  gmailUser: z.string().email(),
  gmailAppPass: z.string().min(1),
})

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return apiError("Unauthorized", 401)

    const body: unknown = await request.json()
    const parsed = testSchema.safeParse(body)

    if (!parsed.success) {
      return apiError("Invalid Gmail credentials", 400)
    }

    const appPass =
      parsed.data.gmailAppPass === "••••••••"
        ? null
        : decryptSecret(parsed.data.gmailAppPass) ?? parsed.data.gmailAppPass

    if (!appPass) {
      return apiError("Gmail app password is required", 400)
    }

    const success = await testConnection(parsed.data.gmailUser, appPass)

    if (!success) {
      return apiResponse({ success: false, error: "Connection failed. Check your credentials." })
    }

    return apiResponse({ success: true })
  } catch (error) {
    console.error("Test Gmail error:", error)
    return apiResponse({ success: false, error: "Connection test failed" })
  }
}
