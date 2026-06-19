import type { CampaignReplyMode } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { generateReplyEmail } from "@/lib/gemini"
import { getGeminiApiKey } from "@/lib/settings-secrets"

export function buildMessageId(emailLogId: string): string {
  const host =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "") ?? "leadflow.app"
  return `<${emailLogId}@${host}>`
}

export function emailLogIdFromMessageId(messageId: string): string | null {
  const normalized = messageId.replace(/^<|>$/g, "")
  const atIndex = normalized.indexOf("@")
  if (atIndex <= 0) return null
  return normalized.slice(0, atIndex)
}

export function extractMessageIds(header: string | undefined | null): string[] {
  if (!header) return []
  const matches = header.match(/<[^>]+>/g) ?? []
  return matches.map((m) => m.slice(1, -1))
}

export interface InboundReplyInput {
  emailLogId: string
  replyBody?: string
  replySubject?: string
  fromEmail?: string
  receivedAt?: Date
}

const UNSUBSCRIBE_KEYWORDS = [
  "unsubscribe",
  "remove me",
  "stop emailing",
  "opt out",
  "don't contact",
  "do not contact",
]

function looksLikeUnsubscribe(body: string): boolean {
  const lower = body.toLowerCase()
  return UNSUBSCRIBE_KEYWORDS.some((kw) => lower.includes(kw))
}

async function handleLeadUnsubscribe(leadId: string): Promise<void> {
  await prisma.lead.update({
    where: { id: leadId },
    data: { status: "UNSUBSCRIBED" },
  })
  await prisma.campaignLead.updateMany({
    where: { leadId },
    data: { status: "UNSUBSCRIBED" },
  })
  await prisma.emailLog.deleteMany({
    where: { leadId, status: "QUEUED" },
  })
}

async function queueAiResponseEmail(params: {
  inboundReplyId: string
  emailLog: {
    id: string
    leadId: string
    campaignId: string | null
    fromEmail: string
    toEmail: string
    subject: string
    body: string
    lead: {
      firstName: string
      lastName: string
      company: string | null
      jobTitle: string | null
      companyDesc: string | null
      painPoints: string | null
      enrichNotes: string | null
      unsubscribeToken: string | null
    }
    campaign: {
      fromEmail: string | null
      fromName: string | null
      description: string | null
      name: string
    } | null
  }
  aiSubject: string
  aiBody: string
  scheduledFor?: Date
}): Promise<string> {
  const fromEmail =
    params.emailLog.campaign?.fromEmail ?? params.emailLog.fromEmail

  const responseLog = await prisma.emailLog.create({
    data: {
      campaignId: params.emailLog.campaignId,
      leadId: params.emailLog.leadId,
      subject: params.aiSubject.startsWith("Re:")
        ? params.aiSubject
        : `Re: ${params.aiSubject}`,
      body: params.aiBody,
      fromEmail,
      toEmail: params.emailLog.toEmail,
      status: "QUEUED",
      scheduledFor: params.scheduledFor ?? new Date(),
      isAiReply: true,
    },
  })

  await prisma.inboundReply.update({
    where: { id: params.inboundReplyId },
    data: { responseEmailLogId: responseLog.id },
  })

  return responseLog.id
}

export async function handleInboundReply(
  input: InboundReplyInput
): Promise<boolean> {
  const { emailLogId, replyBody = "", replySubject = "", fromEmail = "", receivedAt = new Date() } = input

  const emailLog = await prisma.emailLog.findUnique({
    where: { id: emailLogId },
    include: {
      lead: true,
      campaign: true,
    },
  })

  if (!emailLog || emailLog.repliedAt) return false

  const userId = emailLog.lead.userId
  const replyMode: CampaignReplyMode =
    emailLog.campaign?.replyMode ?? "DISABLED"

  await prisma.$transaction(async (tx) => {
    await tx.emailLog.update({
      where: { id: emailLogId },
      data: { repliedAt: receivedAt, status: "REPLIED" },
    })

    await tx.lead.update({
      where: { id: emailLog.leadId },
      data: { status: "REPLIED" },
    })

    if (emailLog.campaignId) {
      await tx.campaignLead.updateMany({
        where: {
          campaignId: emailLog.campaignId,
          leadId: emailLog.leadId,
          status: { not: "REPLIED" },
        },
        data: { status: "REPLIED", repliedAt: receivedAt },
      })

      await tx.emailLog.deleteMany({
        where: {
          campaignId: emailLog.campaignId,
          leadId: emailLog.leadId,
          status: "QUEUED",
          isAiReply: false,
        },
      })
    }
  })

  if (!replyBody.trim()) {
    return true
  }

  const inboundReply = await prisma.inboundReply.create({
    data: {
      emailLogId,
      leadId: emailLog.leadId,
      campaignId: emailLog.campaignId,
      userId,
      fromEmail: fromEmail || emailLog.toEmail,
      subject: replySubject || `Re: ${emailLog.subject}`,
      body: replyBody,
      receivedAt,
      status: replyMode === "DISABLED" ? "SKIPPED" : "PENDING_REVIEW",
    },
  })

  if (replyMode === "DISABLED") return true

  if (looksLikeUnsubscribe(replyBody)) {
    await handleLeadUnsubscribe(emailLog.leadId)
    await prisma.inboundReply.update({
      where: { id: inboundReply.id },
      data: { intent: "unsubscribe", status: "SKIPPED" },
    })
    return true
  }

  const settings = await prisma.settings.findUnique({ where: { userId } })
  const apiKey = getGeminiApiKey(settings?.geminiKey)
  if (!apiKey) {
    await prisma.inboundReply.update({
      where: { id: inboundReply.id },
      data: { status: "SKIPPED" },
    })
    return true
  }

  try {
    const generated = await generateReplyEmail(
      emailLog.lead,
      { subject: emailLog.subject, body: emailLog.body },
      replyBody,
      emailLog.campaign?.description ?? emailLog.campaign?.name ?? "Follow up",
      apiKey
    )

    if (generated.intent === "unsubscribe") {
      await handleLeadUnsubscribe(emailLog.leadId)
      await prisma.inboundReply.update({
        where: { id: inboundReply.id },
        data: {
          intent: generated.intent,
          aiSubject: generated.subject,
          aiBody: generated.body,
          aiReasoning: generated.reasoning,
          status: "SKIPPED",
        },
      })
      return true
    }

    if (generated.intent === "ooo") {
      await prisma.inboundReply.update({
        where: { id: inboundReply.id },
        data: {
          intent: generated.intent,
          aiSubject: generated.subject,
          aiBody: generated.body,
          aiReasoning: generated.reasoning,
          status: "SKIPPED",
        },
      })
      return true
    }

    if (replyMode === "AUTO") {
      await prisma.inboundReply.update({
        where: { id: inboundReply.id },
        data: {
          intent: generated.intent,
          aiSubject: generated.subject,
          aiBody: generated.body,
          aiReasoning: generated.reasoning,
          status: "APPROVED",
          reviewedAt: new Date(),
        },
      })

      await queueAiResponseEmail({
        inboundReplyId: inboundReply.id,
        emailLog,
        aiSubject: generated.subject,
        aiBody: generated.body,
      })
    } else {
      await prisma.inboundReply.update({
        where: { id: inboundReply.id },
        data: {
          intent: generated.intent,
          aiSubject: generated.subject,
          aiBody: generated.body,
          aiReasoning: generated.reasoning,
          status: "PENDING_REVIEW",
        },
      })
    }
  } catch (error) {
    console.error("AI reply generation failed:", error)
    await prisma.inboundReply.update({
      where: { id: inboundReply.id },
      data: { status: "SKIPPED" },
    })
  }

  return true
}

export async function handleLeadReply(
  emailLogId: string,
  repliedAt: Date = new Date()
): Promise<boolean> {
  return handleInboundReply({
    emailLogId,
    receivedAt: repliedAt,
  })
}

export async function approveInboundReply(
  inboundReplyId: string,
  userId: string,
  overrides?: { aiSubject?: string; aiBody?: string }
): Promise<boolean> {
  const inbound = await prisma.inboundReply.findFirst({
    where: { id: inboundReplyId, userId },
    include: {
      emailLog: {
        include: { lead: true, campaign: true },
      },
    },
  })

  if (!inbound || inbound.status !== "PENDING_REVIEW") return false

  const aiSubject = overrides?.aiSubject ?? inbound.aiSubject
  const aiBody = overrides?.aiBody ?? inbound.aiBody
  if (!aiSubject || !aiBody) return false

  await prisma.inboundReply.update({
    where: { id: inboundReplyId },
    data: {
      aiSubject,
      aiBody,
      status: "APPROVED",
      reviewedAt: new Date(),
      reviewedBy: userId,
    },
  })

  await queueAiResponseEmail({
    inboundReplyId,
    emailLog: inbound.emailLog,
    aiSubject,
    aiBody,
  })

  return true
}

export async function cancelQueuedEmailsForLead(
  leadId: string,
  campaignId?: string | null
): Promise<number> {
  const result = await prisma.emailLog.deleteMany({
    where: {
      leadId,
      status: "QUEUED",
      isAiReply: false,
      ...(campaignId ? { campaignId } : {}),
    },
  })
  return result.count
}
