import { z } from "zod"
import bcrypt from "bcryptjs"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { apiError, apiResponse } from "@/lib/api"
import { encryptIfNeeded } from "@/lib/settings-secrets"

const updateSettingsSchema = z.object({
  geminiKey: z.string().optional(),
  gmailUser: z.string().email().optional(),
  gmailAppPass: z.string().optional(),
  fromName: z.string().optional(),
  fromEmail: z.string().email().optional(),
})

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
})

function maskKey(key: string | null | undefined): string | null {
  if (!key) return null
  if (key.length <= 8) return "••••••••"
  return `${key.slice(0, 4)}${"•".repeat(key.length - 8)}${key.slice(-4)}`
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return apiError("Unauthorized", 401)

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        settings: true,
      },
    })

    if (!user) return apiError("User not found", 404)

    return apiResponse({
      email: user.email,
      name: user.name,
      settings: user.settings
        ? {
            ...user.settings,
            geminiKey: maskKey(user.settings.geminiKey),
            gmailAppPass: user.settings.gmailAppPass ? "••••••••" : null,
            hasGeminiKey: !!user.settings.geminiKey,
            hasGmailPass: !!user.settings.gmailAppPass,
          }
        : null,
    })
  } catch (error) {
    console.error("GET settings error:", error)
    return apiError("Failed to fetch settings")
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return apiError("Unauthorized", 401)

    const body: unknown = await request.json()

    if (
      typeof body === "object" &&
      body !== null &&
      ("name" in body || "currentPassword" in body)
    ) {
      const parsed = updateProfileSchema.safeParse(body)
      if (!parsed.success) {
        return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 400)
      }

      if (parsed.data.name) {
        await prisma.user.update({
          where: { id: session.user.id },
          data: { name: parsed.data.name },
        })
      }

      if (parsed.data.newPassword && parsed.data.currentPassword) {
        const user = await prisma.user.findUnique({
          where: { id: session.user.id },
        })
        if (!user) return apiError("User not found", 404)

        const valid = await bcrypt.compare(
          parsed.data.currentPassword,
          user.password
        )
        if (!valid) return apiError("Current password is incorrect", 400)

        const hashed = await bcrypt.hash(parsed.data.newPassword, 12)
        await prisma.user.update({
          where: { id: session.user.id },
          data: { password: hashed },
        })
      }

      return apiResponse({ updated: true })
    }

    const parsed = updateSettingsSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 400)
    }

    const existing = await prisma.settings.findUnique({
      where: { userId: session.user.id },
    })

    const data = { ...parsed.data }
    if (data.gmailAppPass === "••••••••") delete data.gmailAppPass
    if (data.geminiKey?.includes("•")) delete data.geminiKey

    if (data.gmailAppPass) data.gmailAppPass = encryptIfNeeded(data.gmailAppPass)
    if (data.geminiKey) data.geminiKey = encryptIfNeeded(data.geminiKey)

    if (existing) {
      await prisma.settings.update({
        where: { userId: session.user.id },
        data,
      })
    } else {
      await prisma.settings.create({
        data: { userId: session.user.id, ...data },
      })
    }

    return apiResponse({ updated: true })
  } catch (error) {
    console.error("PATCH settings error:", error)
    return apiError("Failed to update settings")
  }
}
