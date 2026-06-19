import { z } from "zod"
import { randomUUID } from "crypto"
import type { LeadStatus } from "@/generated/prisma/client"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { apiError, apiResponse } from "@/lib/api"

const leadQuerySchema = z.object({
  search: z.string().optional().default(""),
  status: z.string().optional().default(""),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

const createLeadSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().default(""),
  email: z.string().email(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  website: z.string().optional(),
  linkedinUrl: z.string().optional(),
  location: z.string().optional(),
  industry: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return apiError("Unauthorized", 401)

    const { searchParams } = new URL(request.url)
    const query = leadQuerySchema.safeParse({
      search: searchParams.get("search") ?? "",
      status: searchParams.get("status") ?? "",
      page: searchParams.get("page") ?? "1",
      limit: searchParams.get("limit") ?? "20",
    })

    if (!query.success) {
      return apiError(query.error.issues[0]?.message ?? "Invalid query", 400)
    }

    const { search, status, page, limit } = query.data

    const where = {
      userId: session.user.id,
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: "insensitive" as const } },
          { lastName: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
          { company: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(status && { status: status as LeadStatus }),
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.lead.count({ where }),
    ])

    return apiResponse({
      leads,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error("GET leads error:", error)
    return apiError("Failed to fetch leads")
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return apiError("Unauthorized", 401)

    const body: unknown = await request.json()
    const parsed = createLeadSchema.safeParse(body)

    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 400)
    }

    const lead = await prisma.lead.create({
      data: {
        ...parsed.data,
        userId: session.user.id,
        tags: parsed.data.tags ?? [],
        unsubscribeToken: randomUUID(),
      },
    })

    return apiResponse(lead, 201)
  } catch (error) {
    console.error("POST leads error:", error)
    return apiError("Failed to create lead")
  }
}
