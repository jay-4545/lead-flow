import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { apiError, apiResponse } from "@/lib/api"
import { handleLeadReply } from "@/lib/reply-handler"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return apiError("Unauthorized", 401)

    const { id } = await params

    const lead = await prisma.lead.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!lead) return apiError("Lead not found", 404)

    const latestSent = await prisma.emailLog.findFirst({
      where: {
        leadId: id,
        status: { in: ["SENT", "OPENED", "CLICKED", "REPLIED"] },
      },
      orderBy: { sentAt: "desc" },
    })

    if (!latestSent) {
      return apiError("No sent emails found for this lead", 400)
    }

    if (latestSent.repliedAt) {
      return apiResponse({ alreadyReplied: true, emailLogId: latestSent.id })
    }

    await handleLeadReply(latestSent.id)

    return apiResponse({ replied: true, emailLogId: latestSent.id })
  } catch (error) {
    console.error("Mark replied error:", error)
    return apiError("Failed to mark lead as replied")
  }
}
