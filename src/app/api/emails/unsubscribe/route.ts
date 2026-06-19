import { prisma } from "@/lib/prisma"
import { getSafeRedirectUrl } from "@/lib/security-edge"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token")

  if (token) {
    const lead = await prisma.lead.findUnique({
      where: { unsubscribeToken: token },
    })

    if (lead) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: "UNSUBSCRIBED" },
      })

      await prisma.campaignLead.updateMany({
        where: { leadId: lead.id },
        data: { status: "UNSUBSCRIBED" },
      })

      await prisma.emailLog.deleteMany({
        where: { leadId: lead.id, status: "QUEUED" },
      })
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ""
  const fallback = appUrl ? `${appUrl}/unsubscribed` : "/login"
  const redirectTo = getSafeRedirectUrl(searchParams.get("redirect"), fallback)

  return Response.redirect(redirectTo, 302)
}
