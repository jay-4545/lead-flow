import { prisma } from "@/lib/prisma"
import { getSafeRedirectUrl } from "@/lib/security-edge"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token")
  const url = searchParams.get("url")

  if (token) {
    await prisma.emailLog.updateMany({
      where: { clickTrackToken: token },
      data: {
        status: "CLICKED",
        clickedAt: new Date(),
        clickCount: { increment: 1 },
      },
    })
  }

  const redirectTo = getSafeRedirectUrl(url)
  return Response.redirect(redirectTo, 302)
}
