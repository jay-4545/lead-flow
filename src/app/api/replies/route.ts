import type { InboundReplyStatus } from "@/generated/prisma/client"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { apiError, apiResponse } from "@/lib/api"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return apiError("Unauthorized", 401)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") as InboundReplyStatus | null

    const replies = await prisma.inboundReply.findMany({
      where: {
        userId: session.user.id,
        ...(status ? { status } : {}),
      },
      orderBy: { receivedAt: "desc" },
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            company: true,
          },
        },
        campaign: { select: { id: true, name: true } },
        emailLog: { select: { subject: true } },
      },
      take: 100,
    })

    const pendingCount = await prisma.inboundReply.count({
      where: { userId: session.user.id, status: "PENDING_REVIEW" },
    })

    return apiResponse({ replies, pendingCount })
  } catch (error) {
    console.error("GET replies error:", error)
    return apiError("Failed to fetch replies")
  }
}
