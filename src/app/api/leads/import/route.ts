import { z } from "zod"
import { randomUUID } from "crypto"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { apiError, apiResponse } from "@/lib/api"

const importSchema = z.array(
  z.object({
    firstName: z.string().min(1),
    lastName: z.string().optional().default(""),
    email: z.string().email(),
    company: z.string().optional(),
    jobTitle: z.string().optional(),
    website: z.string().optional(),
    linkedinUrl: z.string().optional(),
    location: z.string().optional(),
    industry: z.string().optional(),
  })
)

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return apiError("Unauthorized", 401)

    const body: unknown = await request.json()
    const parsed = importSchema.safeParse(body)

    if (!parsed.success) {
      return apiError("Invalid lead data format", 400)
    }

    const leads = parsed.data.map((lead) => ({
      ...lead,
      lastName: lead.lastName ?? "",
      userId: session.user!.id,
      unsubscribeToken: randomUUID(),
    }))

    const result = await prisma.lead.createMany({
      data: leads,
      skipDuplicates: true,
    })

    return apiResponse({
      imported: result.count,
      skipped: leads.length - result.count,
    })
  } catch (error) {
    console.error("Import leads error:", error)
    return apiError("Failed to import leads")
  }
}
