import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { apiError, apiResponse } from "@/lib/api"

const createCampaignSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  fromEmail: z.string().email().optional(),
  fromName: z.string().optional(),
  sendingDays: z.array(z.string()).default(["Mon", "Tue", "Wed", "Thu", "Fri"]),
  sendingStartHour: z.number().min(0).max(23).default(9),
  sendingEndHour: z.number().min(0).max(23).default(17),
  timezone: z.string().default("UTC"),
  replyMode: z.enum(["DISABLED", "AUTO", "REVIEW"]).default("DISABLED"),
  steps: z
    .array(
      z.object({
        stepNumber: z.number(),
        subject: z.string(),
        body: z.string(),
        delayDays: z.number().default(0),
        isAiGenerated: z.boolean().default(false),
      })
    )
    .min(1),
  leadIds: z.array(z.string()).default([]),
})

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return apiError("Unauthorized", 401)

    const campaigns = await prisma.campaign.findMany({
      where: { userId: session.user.id },
      include: {
        steps: { orderBy: { stepNumber: "asc" } },
        _count: { select: { campaignLeads: true, emailLogs: true } },
        emailLogs: {
          select: { status: true, openCount: true, clickCount: true, repliedAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    const campaignsWithStats = campaigns.map((campaign) => {
      const sent = campaign.emailLogs.filter(
        (e) => e.status !== "QUEUED" && e.status !== "FAILED"
      ).length
      const opened = campaign.emailLogs.filter((e) => e.openCount > 0).length
      const clicked = campaign.emailLogs.filter((e) => e.clickCount > 0).length
      const replied = campaign.emailLogs.filter((e) => e.repliedAt).length

      return {
        ...campaign,
        emailLogs: undefined,
        stats: {
          sent,
          opened,
          clicked,
          replied,
          openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
          clickRate: sent > 0 ? Math.round((clicked / sent) * 100) : 0,
          replyRate: sent > 0 ? Math.round((replied / sent) * 100) : 0,
        },
      }
    })

    return apiResponse(campaignsWithStats)
  } catch (error) {
    console.error("GET campaigns error:", error)
    return apiError("Failed to fetch campaigns")
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return apiError("Unauthorized", 401)

    const body: unknown = await request.json()
    const parsed = createCampaignSchema.safeParse(body)

    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 400)
    }

    const { steps, leadIds, ...campaignData } = parsed.data

    if (leadIds.length > 0) {
      const ownedLeads = await prisma.lead.count({
        where: { id: { in: leadIds }, userId: session.user.id },
      })
      if (ownedLeads !== leadIds.length) {
        return apiError("One or more leads do not belong to your account", 403)
      }
    }

    const campaign = await prisma.campaign.create({
      data: {
        ...campaignData,
        userId: session.user.id,
        steps: {
          create: steps,
        },
        campaignLeads: {
          create: leadIds.map((leadId) => ({ leadId })),
        },
      },
      include: {
        steps: true,
        _count: { select: { campaignLeads: true } },
      },
    })

    return apiResponse(campaign, 201)
  } catch (error) {
    console.error("POST campaigns error:", error)
    return apiError("Failed to create campaign")
  }
}
