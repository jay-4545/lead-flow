import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { enrichLead, formatGeminiError, isRateLimitError } from "@/lib/gemini"
import { apiError, apiResponse } from "@/lib/api"
import { getGeminiApiKey } from "@/lib/settings-secrets"

const enrichSchema = z.object({
  leadId: z.string().min(1),
})

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return apiError("Unauthorized", 401)

    const body: unknown = await request.json()
    const parsed = enrichSchema.safeParse(body)

    if (!parsed.success) {
      return apiError("Invalid request", 400)
    }

    const lead = await prisma.lead.findFirst({
      where: { id: parsed.data.leadId, userId: session.user.id },
    })

    if (!lead) return apiError("Lead not found", 404)

    const settings = await prisma.settings.findUnique({
      where: { userId: session.user.id },
    })

    const apiKey = getGeminiApiKey(settings?.geminiKey)
    if (!apiKey) {
      return apiError("Add Gemini key in Settings", 400)
    }

    const enrichment = await enrichLead(lead, apiKey)

    const updated = await prisma.lead.update({
      where: { id: lead.id },
      data: {
        isEnriched: true,
        enrichedAt: new Date(),
        companyDesc: enrichment.companyDesc,
        painPoints: enrichment.painPoints,
        icpScore: enrichment.icpScore,
        enrichNotes: enrichment.enrichNotes,
      },
    })

    return apiResponse(updated)
  } catch (error) {
    console.error("Enrich lead error:", error)
    return apiError(formatGeminiError(error), isRateLimitError(error) ? 429 : 500)
  }
}
