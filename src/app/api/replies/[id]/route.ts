import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { apiError, apiResponse } from "@/lib/api"
import { approveInboundReply } from "@/lib/reply-handler"

const patchReplySchema = z.object({
  action: z.enum(["approve", "skip", "update"]),
  aiSubject: z.string().optional(),
  aiBody: z.string().optional(),
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return apiError("Unauthorized", 401)

    const { id } = await params

    const reply = await prisma.inboundReply.findFirst({
      where: { id, userId: session.user.id },
      include: {
        lead: true,
        campaign: { select: { id: true, name: true, description: true } },
        emailLog: {
          select: { subject: true, body: true, sentAt: true },
        },
        responseEmailLog: {
          select: { id: true, subject: true, body: true, status: true, sentAt: true },
        },
      },
    })

    if (!reply) return apiError("Reply not found", 404)

    return apiResponse(reply)
  } catch (error) {
    console.error("GET reply error:", error)
    return apiError("Failed to fetch reply")
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return apiError("Unauthorized", 401)

    const { id } = await params
    const body: unknown = await request.json()
    const parsed = patchReplySchema.safeParse(body)

    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 400)
    }

    const existing = await prisma.inboundReply.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!existing) return apiError("Reply not found", 404)

    const { action, aiSubject, aiBody } = parsed.data

    if (action === "skip") {
      await prisma.inboundReply.update({
        where: { id },
        data: {
          status: "SKIPPED",
          reviewedAt: new Date(),
          reviewedBy: session.user.id,
        },
      })
      return apiResponse({ skipped: true })
    }

    if (action === "update") {
      const updated = await prisma.inboundReply.update({
        where: { id },
        data: {
          ...(aiSubject !== undefined && { aiSubject }),
          ...(aiBody !== undefined && { aiBody }),
        },
      })
      return apiResponse(updated)
    }

    if (action === "approve") {
      const ok = await approveInboundReply(id, session.user.id, {
        aiSubject,
        aiBody,
      })
      if (!ok) return apiError("Cannot approve this reply", 400)
      return apiResponse({ approved: true })
    }

    return apiError("Invalid action", 400)
  } catch (error) {
    console.error("PATCH reply error:", error)
    return apiError("Failed to update reply")
  }
}
