import { z } from "zod"
import type { CampaignStatus } from "@/generated/prisma/client"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { apiError, apiResponse } from "@/lib/api"

const stepSchema = z.object({
  stepNumber: z.number(),
  subject: z.string(),
  body: z.string(),
  delayDays: z.number().default(0),
  isAiGenerated: z.boolean().default(false),
})

const updateCampaignSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.string().optional(),
  fromEmail: z.string().email().nullable().optional(),
  fromName: z.string().nullable().optional(),
  sendingDays: z.array(z.string()).optional(),
  sendingStartHour: z.number().optional(),
  sendingEndHour: z.number().optional(),
  timezone: z.string().optional(),
  replyMode: z.enum(["DISABLED", "AUTO", "REVIEW"]).optional(),
  steps: z.array(stepSchema).optional(),
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return apiError("Unauthorized", 401)

    const { id } = await params

    const campaign = await prisma.campaign.findFirst({
      where: { id, userId: session.user.id },
      include: {
        steps: { orderBy: { stepNumber: "asc" } },
        campaignLeads: {
          include: {
            lead: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                company: true,
                icpScore: true,
              },
            },
          },
        },
        inboundReplies: {
          select: {
            id: true,
            leadId: true,
            body: true,
            receivedAt: true,
            status: true,
          },
        },
        emailLogs: true,
      },
    })

    if (!campaign) return apiError("Campaign not found", 404)

    const sent = campaign.emailLogs.filter(
      (e) => e.status !== "QUEUED" && e.status !== "FAILED"
    ).length
    const opened = campaign.emailLogs.filter((e) => e.openCount > 0).length
    const clicked = campaign.emailLogs.filter((e) => e.clickCount > 0).length
    const replied = campaign.emailLogs.filter((e) => e.repliedAt).length

    return apiResponse({
      ...campaign,
      stats: {
        sent,
        opened,
        clicked,
        replied,
        openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
        clickRate: sent > 0 ? Math.round((clicked / sent) * 100) : 0,
        replyRate: sent > 0 ? Math.round((replied / sent) * 100) : 0,
      },
    })
  } catch (error) {
    console.error("GET campaign error:", error)
    return apiError("Failed to fetch campaign")
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
    const parsed = updateCampaignSchema.safeParse(body)

    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 400)
    }

    const existing = await prisma.campaign.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!existing) return apiError("Campaign not found", 404)

    const { status, steps, ...rest } = parsed.data

    if (steps && existing.status !== "DRAFT") {
      return apiError("Only draft campaigns can have their sequence edited", 400)
    }

    if (steps) {
      await prisma.campaignStep.deleteMany({ where: { campaignId: id } })
    }

    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        ...rest,
        ...(status && { status: status as CampaignStatus }),
        ...(status === "COMPLETED" && { completedAt: new Date() }),
        ...(steps && {
          steps: {
            create: steps.map((s) => ({
              stepNumber: s.stepNumber,
              subject: s.subject,
              body: s.body,
              delayDays: s.delayDays,
              isAiGenerated: s.isAiGenerated ?? false,
            })),
          },
        }),
      },
      include: { steps: { orderBy: { stepNumber: "asc" } } },
    })

    return apiResponse(campaign)
  } catch (error) {
    console.error("PATCH campaign error:", error)
    return apiError("Failed to update campaign")
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return apiError("Unauthorized", 401)

    const { id } = await params

    const existing = await prisma.campaign.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!existing) return apiError("Campaign not found", 404)

    await prisma.campaign.update({
      where: { id },
      data: { status: "ARCHIVED" },
    })

    return apiResponse({ archived: true })
  } catch (error) {
    console.error("DELETE campaign error:", error)
    return apiError("Failed to archive campaign")
  }
}
