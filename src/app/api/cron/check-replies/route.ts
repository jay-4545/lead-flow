import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkRepliesForUser } from "@/lib/gmail-inbox"
import { decryptSettingsSecrets } from "@/lib/settings-secrets"
import { verifyCronSecret } from "@/lib/security"

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const usersWithGmail = await prisma.settings.findMany({
    where: {
      gmailUser: { not: null },
      gmailAppPass: { not: null },
    },
    select: {
      userId: true,
      gmailUser: true,
      gmailAppPass: true,
    },
  })

  let totalDetected = 0
  let totalScanned = 0
  let usersChecked = 0
  const errorDetails: string[] = []

  for (const settings of usersWithGmail) {
    const decrypted = decryptSettingsSecrets(settings)
    if (!decrypted?.gmailUser || !decrypted?.gmailAppPass) continue

    try {
      const { detected, scanned } = await checkRepliesForUser(
        settings.userId,
        decrypted.gmailUser,
        decrypted.gmailAppPass
      )
      totalDetected += detected
      totalScanned += scanned
      usersChecked++
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown reply check error"
      console.error(`Reply check failed for user ${settings.userId}:`, error)
      errorDetails.push(message)
    }
  }

  return NextResponse.json({
    detected: totalDetected,
    scanned: totalScanned,
    usersChecked,
    errors: errorDetails.length,
    ...(errorDetails.length > 0 && { errorDetails }),
  })
}
