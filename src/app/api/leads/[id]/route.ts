import { z } from "zod"
import type { LeadStatus } from "@/generated/prisma/client"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { apiError, apiResponse } from "@/lib/api"
import {
  cancelQueuedEmailsForLead,
  handleLeadReply,
} from "@/lib/reply-handler"

const updateLeadSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  company: z.string().nullable().optional(),
  jobTitle: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  linkedinUrl: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return apiError("Unauthorized", 401)

    const { id } = await params

    const lead = await prisma.lead.findFirst({
      where: { id, userId: session.user.id },
      include: {
        emailLogs: {
          orderBy: { createdAt: "desc" },
          include: { campaign: { select: { name: true } } },
        },
        inboundReplies: {
          orderBy: { receivedAt: "desc" },
          include: {
            emailLog: { select: { subject: true, body: true, sentAt: true } },
            responseEmailLog: {
              select: { subject: true, body: true, status: true, sentAt: true },
            },
            campaign: { select: { name: true } },
          },
        },
      },
    })

    if (!lead) return apiError("Lead not found", 404)

    return apiResponse(lead)
  } catch (error) {
    console.error("GET lead error:", error)
    return apiError("Failed to fetch lead")
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return apiError("Unauthorized", 401)

    const { id } = await params
    const body: unknown = await request.json()
    const parsed = updateLeadSchema.safeParse(body)

    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 400)
    }

    const existing = await prisma.lead.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!existing) return apiError("Lead not found", 404)

    const { status, ...rest } = parsed.data

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        ...rest,
        ...(status && { status: status as LeadStatus }),
      },
    })

    if (status === "REPLIED") {
      const latestSent = await prisma.emailLog.findFirst({
        where: {
          leadId: id,
          status: { in: ["SENT", "OPENED", "CLICKED"] },
        },
        orderBy: { sentAt: "desc" },
      })

      if (latestSent) {
        await handleLeadReply(latestSent.id)
      } else {
        await cancelQueuedEmailsForLead(id)
        await prisma.campaignLead.updateMany({
          where: { leadId: id, status: { not: "REPLIED" } },
          data: { status: "REPLIED", repliedAt: new Date() },
        })
      }
    }

    return apiResponse(lead)
  } catch (error) {
    console.error("PUT lead error:", error)
    return apiError("Failed to update lead")
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

    const existing = await prisma.lead.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!existing) return apiError("Lead not found", 404)

    await prisma.lead.delete({ where: { id } })

    return apiResponse({ deleted: true })
  } catch (error) {
    console.error("DELETE lead error:", error)
    return apiError("Failed to delete lead")
  }
}
