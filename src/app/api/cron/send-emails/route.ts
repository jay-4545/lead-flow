import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/mailer"
import { applyMergeTags } from "@/lib/merge-tags"
import { buildMessageId } from "@/lib/reply-handler"
import { getNextSendSlot, isWithinSendWindow } from "@/lib/send-window"
import { decryptSettingsSecrets } from "@/lib/settings-secrets"
import { verifyCronSecret } from "@/lib/security"

export const runtime = "nodejs"
export const maxDuration = 60
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const now = new Date()

  const dueEmails = await prisma.emailLog.findMany({
    where: {
      status: "QUEUED",
      scheduledFor: { lte: now },
    },
    include: {
      lead: true,
      step: true,
      campaign: {
        include: {
          steps: { orderBy: { stepNumber: "asc" } },
          user: { include: { settings: true } },
          campaignLeads: true,
        },
      },
    },
    take: 20,
  })

  let sent = 0
  let failed = 0
  let skipped = 0
  let rescheduled = 0

  for (const emailLog of dueEmails) {
    try {
      const isAiReply = emailLog.isAiReply

      if (
        !isAiReply &&
        (emailLog.lead.status === "REPLIED" ||
          emailLog.lead.status === "UNSUBSCRIBED")
      ) {
        await prisma.emailLog.delete({ where: { id: emailLog.id } })
        skipped++
        continue
      }

      if (emailLog.lead.status === "UNSUBSCRIBED") {
        await prisma.emailLog.delete({ where: { id: emailLog.id } })
        skipped++
        continue
      }

      if (emailLog.campaign && !isAiReply) {
        if (emailLog.campaign.status !== "ACTIVE") {
          skipped++
          continue
        }

        const campaignLead = emailLog.campaign.campaignLeads.find(
          (cl) => cl.leadId === emailLog.leadId
        )
        if (
          campaignLead?.status === "REPLIED" ||
          campaignLead?.status === "UNSUBSCRIBED"
        ) {
          await prisma.emailLog.delete({ where: { id: emailLog.id } })
          skipped++
          continue
        }

        const windowConfig = {
          sendingDays: emailLog.campaign.sendingDays,
          sendingStartHour: emailLog.campaign.sendingStartHour,
          sendingEndHour: emailLog.campaign.sendingEndHour,
          timezone: emailLog.campaign.timezone,
        }

        if (!isWithinSendWindow(now, windowConfig)) {
          const nextSlot = getNextSendSlot(now, windowConfig)
          await prisma.emailLog.update({
            where: { id: emailLog.id },
            data: { scheduledFor: nextSlot },
          })
          rescheduled++
          continue
        }
      }

      const rawSettings =
        emailLog.campaign?.user?.settings ??
        (isAiReply
          ? (
              await prisma.user.findUnique({
                where: { id: emailLog.lead.userId },
                include: { settings: true },
              })
            )?.settings
          : null)
      const settings = decryptSettingsSecrets(rawSettings ?? null)
      if (!settings?.gmailUser || !settings?.gmailAppPass) {
        await prisma.emailLog.update({
          where: { id: emailLog.id },
          data: { status: "FAILED" },
        })
        failed++
        continue
      }

      const subject = applyMergeTags(emailLog.subject, emailLog.lead)
      const bodyText = applyMergeTags(emailLog.body, emailLog.lead)
      const messageId = buildMessageId(emailLog.id)

      let unsubscribeToken = emailLog.lead.unsubscribeToken
      if (!unsubscribeToken) {
        unsubscribeToken = randomUUID()
        await prisma.lead.update({
          where: { id: emailLog.leadId },
          data: { unsubscribeToken },
        })
      }

      await sendEmail({
        to: emailLog.toEmail,
        from: emailLog.fromEmail,
        fromName: settings.fromName ?? "LeadFlow",
        subject,
        html: `<div style="font-family: sans-serif; max-width: 600px;">${bodyText.replace(/\n/g, "<br/>")}</div>`,
        openTrackToken: emailLog.openTrackToken,
        clickTrackToken: emailLog.clickTrackToken,
        gmailUser: settings.gmailUser,
        gmailAppPass: settings.gmailAppPass,
        messageId,
        unsubscribeToken,
      })

      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: { status: "SENT", sentAt: now, messageId, subject, body: bodyText },
      })

      if (isAiReply) {
        await prisma.inboundReply.updateMany({
          where: { responseEmailLogId: emailLog.id },
          data: { status: "SENT" },
        })
      }

      if (!isAiReply) {
        await prisma.lead.update({
          where: { id: emailLog.leadId },
          data: { status: "CONTACTED" },
        })
      }

      if (emailLog.campaign && emailLog.step && !isAiReply) {
        const currentStepNum = emailLog.step.stepNumber
        const nextStep = emailLog.campaign.steps.find(
          (s) => s.stepNumber === currentStepNum + 1
        )

        if (nextStep) {
          const windowConfig = {
            sendingDays: emailLog.campaign.sendingDays,
            sendingStartHour: emailLog.campaign.sendingStartHour,
            sendingEndHour: emailLog.campaign.sendingEndHour,
            timezone: emailLog.campaign.timezone,
          }
          let nextSendDate = new Date(now)
          nextSendDate.setDate(nextSendDate.getDate() + nextStep.delayDays)
          if (!isWithinSendWindow(nextSendDate, windowConfig)) {
            nextSendDate = getNextSendSlot(nextSendDate, windowConfig)
          }

          const existingQueued = await prisma.emailLog.findFirst({
            where: {
              campaignId: emailLog.campaignId,
              leadId: emailLog.leadId,
              stepId: nextStep.id,
              status: "QUEUED",
            },
          })

          if (!existingQueued) {
            await prisma.emailLog.create({
              data: {
                campaignId: emailLog.campaignId,
                stepId: nextStep.id,
                leadId: emailLog.leadId,
                subject: nextStep.subject,
                body: nextStep.body,
                fromEmail: emailLog.fromEmail,
                toEmail: emailLog.toEmail,
                status: "QUEUED",
                scheduledFor: nextSendDate,
              },
            })
          }

          await prisma.campaignLead.updateMany({
            where: {
              campaignId: emailLog.campaignId!,
              leadId: emailLog.leadId,
            },
            data: { currentStep: currentStepNum + 1 },
          })
        } else {
          await prisma.campaignLead.updateMany({
            where: {
              campaignId: emailLog.campaignId!,
              leadId: emailLog.leadId,
            },
            data: { status: "COMPLETED", completedAt: now },
          })
        }
      }

      sent++
    } catch (error) {
      console.error(`Failed to send email ${emailLog.id}:`, error)
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: { status: "FAILED" },
      })
      failed++
    }
  }

  return NextResponse.json({
    sent,
    failed,
    skipped,
    rescheduled,
    processed: dueEmails.length,
  })
}
