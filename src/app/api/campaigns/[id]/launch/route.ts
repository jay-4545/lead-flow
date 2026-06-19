import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { apiError, apiResponse } from "@/lib/api"
import { getNextSendSlot } from "@/lib/send-window"
import { decryptSettingsSecrets } from "@/lib/settings-secrets"

export async function POST(
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
        campaignLeads: { include: { lead: true } },
        user: { include: { settings: true } },
      },
    })

    if (!campaign) return apiError("Campaign not found", 404)

    if (!["DRAFT", "PAUSED"].includes(campaign.status)) {
      return apiError(
        `Cannot launch campaign with status ${campaign.status}. Only DRAFT or PAUSED campaigns can be launched.`,
        400
      )
    }

    if (campaign.steps.length === 0) {
      return apiError("Campaign must have at least one email step", 400)
    }
    if (campaign.campaignLeads.length === 0) {
      return apiError("Campaign must have at least one lead", 400)
    }

    const settings = decryptSettingsSecrets(campaign.user.settings)
    if (!settings?.gmailUser || !settings?.gmailAppPass) {
      return apiError("Configure Gmail credentials in Settings first", 400)
    }

    const firstStep = campaign.steps[0]
    const fromEmail = campaign.fromEmail ?? settings.fromEmail ?? settings.gmailUser
    const fromName = campaign.fromName ?? settings.fromName ?? "LeadFlow"

    const windowConfig = {
      sendingDays: campaign.sendingDays,
      sendingStartHour: campaign.sendingStartHour,
      sendingEndHour: campaign.sendingEndHour,
      timezone: campaign.timezone,
    }

    let scheduledFor = getNextSendSlot(new Date(), windowConfig)
    let queued = 0
    let skipped = 0

    for (const campaignLead of campaign.campaignLeads) {
      if (
        campaignLead.lead.status === "UNSUBSCRIBED" ||
        campaignLead.lead.status === "REPLIED"
      ) {
        skipped++
        continue
      }

      const existingQueued = await prisma.emailLog.findFirst({
        where: {
          campaignId: campaign.id,
          leadId: campaignLead.leadId,
          stepId: firstStep.id,
          status: "QUEUED",
        },
      })

      if (existingQueued) {
        skipped++
        continue
      }

      await prisma.emailLog.create({
        data: {
          campaignId: campaign.id,
          stepId: firstStep.id,
          leadId: campaignLead.leadId,
          subject: firstStep.subject,
          body: firstStep.body,
          fromEmail,
          toEmail: campaignLead.lead.email,
          status: "QUEUED",
          scheduledFor,
        },
      })

      await prisma.campaignLead.update({
        where: { id: campaignLead.id },
        data: {
          status: "IN_PROGRESS",
          currentStep: 1,
          startedAt: new Date(),
        },
      })

      queued++
    }

    if (queued === 0) {
      return apiError("No leads were queued. All leads may be unsubscribed or already queued.", 400)
    }

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: "ACTIVE",
        launchedAt: campaign.launchedAt ?? new Date(),
        fromEmail,
        fromName,
      },
    })

    return apiResponse({ queued, skipped })
  } catch (error) {
    console.error("Launch campaign error:", error)
    return apiError("Failed to launch campaign")
  }
}
