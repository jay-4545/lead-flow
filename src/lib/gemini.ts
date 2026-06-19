import {
  GoogleGenerativeAI,
  SchemaType,
} from "@google/generative-ai"
import { z } from "zod"

const DEFAULT_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash-lite"
const MAX_RETRIES = 3

const enrichmentSchema = z.object({
  companyDesc: z.string(),
  painPoints: z.string(),
  icpScore: z.number().int().min(1).max(10),
  enrichNotes: z.string(),
})

const emailSchema = z.object({
  subject: z.string(),
  body: z.string(),
  reasoning: z.string(),
})

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function isRateLimitError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status: number }).status === 429
  )
}

function getRetryDelayMs(error: unknown, attempt: number): number {
  if (typeof error === "object" && error !== null && "errorDetails" in error) {
    const details = (error as { errorDetails?: Array<{ retryDelay?: string }> })
      .errorDetails
    const retryInfo = details?.find((d) => d.retryDelay)
    if (retryInfo?.retryDelay) {
      const seconds = parseInt(retryInfo.retryDelay.replace("s", ""), 10)
      if (!Number.isNaN(seconds)) return (seconds + 1) * 1000
    }
  }
  return Math.min(60000, 2000 * Math.pow(2, attempt))
}

export function formatGeminiError(error: unknown): string {
  if (isRateLimitError(error)) {
    return "Gemini rate limit reached. Wait a minute and try again, or switch to gemini-2.0-flash-lite in GEMINI_MODEL."
  }
  if (error instanceof SyntaxError) {
    return "AI returned invalid JSON. Please try again."
  }
  if (error instanceof z.ZodError) {
    return "AI response was missing required fields. Please try again."
  }
  if (error instanceof Error && error.message.includes("API key")) {
    return "Invalid Gemini API key. Check Settings or GEMINI_API_KEY."
  }
  return "AI request failed. Please try again."
}

function extractJsonObject(text: string): string {
  const clean = text.replace(/```json|```/g, "").trim()
  const start = clean.indexOf("{")
  if (start === -1) {
    throw new SyntaxError("No JSON object in AI response")
  }

  let depth = 0
  let inString = false
  let escaped = false

  for (let i = start; i < clean.length; i++) {
    const char = clean[i]

    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === "\\") {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
      continue
    }

    if (char === "{") depth++
    else if (char === "}") {
      depth--
      if (depth === 0) return clean.slice(start, i + 1)
    }
  }

  throw new SyntaxError("Incomplete JSON object in AI response")
}

function parseJsonResponse<T>(text: string, schema: z.ZodType<T>): T {
  const jsonStr = extractJsonObject(text)
  const parsed: unknown = JSON.parse(jsonStr)
  return schema.parse(parsed)
}

function createModel(
  apiKey: string,
  systemPrompt: string,
  maxOutputTokens: number,
  responseSchema: object
) {
  const genAI = new GoogleGenerativeAI(apiKey)
  return genAI.getGenerativeModel({
    model: DEFAULT_MODEL,
    systemInstruction: systemPrompt,
    generationConfig: {
      responseMimeType: "application/json",
      maxOutputTokens,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      responseSchema: responseSchema as any,
    },
  })
}

async function generateJSON<T>(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  maxOutputTokens: number,
  responseSchema: object,
  schema: z.ZodType<T>
): Promise<T> {
  const model = createModel(apiKey, systemPrompt, maxOutputTokens, responseSchema)

  let lastError: unknown

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent(userPrompt)
      const text = result.response.text()

      if (!text?.trim()) {
        throw new SyntaxError("Empty AI response")
      }

      return parseJsonResponse(text, schema)
    } catch (error) {
      lastError = error

      if (isRateLimitError(error) && attempt < MAX_RETRIES - 1) {
        await sleep(getRetryDelayMs(error, attempt))
        continue
      }

      if (
        (error instanceof SyntaxError || error instanceof z.ZodError) &&
        attempt < MAX_RETRIES - 1
      ) {
        await sleep(1000 * (attempt + 1))
        continue
      }

      throw error
    }
  }

  throw lastError ?? new Error("AI request failed")
}

export interface EnrichmentResult {
  companyDesc: string
  painPoints: string
  icpScore: number
  enrichNotes: string
}

const enrichmentResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    companyDesc: { type: SchemaType.STRING },
    painPoints: { type: SchemaType.STRING },
    icpScore: { type: SchemaType.INTEGER },
    enrichNotes: { type: SchemaType.STRING },
  },
  required: ["companyDesc", "painPoints", "icpScore", "enrichNotes"],
}

export async function enrichLead(
  lead: {
    firstName: string
    lastName: string
    company?: string | null
    jobTitle?: string | null
    website?: string | null
    industry?: string | null
  },
  apiKey: string
): Promise<EnrichmentResult> {
  const systemPrompt = `You are a B2B sales researcher. Analyze the lead and return JSON with:
- companyDesc: 2-3 sentences about what the company does
- painPoints: 2-3 likely pain points, comma separated
- icpScore: integer 1-10 for ideal customer fit
- enrichNotes: 1-2 sentences of personalization notes
Keep strings concise. Escape quotes properly in JSON.`

  const userPrompt = `Lead info:
Name: ${lead.firstName} ${lead.lastName}
Company: ${lead.company ?? "Unknown"}
Job Title: ${lead.jobTitle ?? "Unknown"}
Website: ${lead.website ?? "Unknown"}
Industry: ${lead.industry ?? "Unknown"}`

  return generateJSON(
    apiKey,
    systemPrompt,
    userPrompt,
    1024,
    enrichmentResponseSchema,
    enrichmentSchema
  )
}

export interface GeneratedEmail {
  subject: string
  body: string
  reasoning: string
}

const emailResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    subject: { type: SchemaType.STRING },
    body: { type: SchemaType.STRING },
    reasoning: { type: SchemaType.STRING },
  },
  required: ["subject", "body", "reasoning"],
}

export async function generateEmail(
  lead: {
    firstName: string
    lastName: string
    company?: string | null
    jobTitle?: string | null
    companyDesc?: string | null
    painPoints?: string | null
    enrichNotes?: string | null
  },
  stepNumber: number,
  campaignGoal: string,
  apiKey: string
): Promise<GeneratedEmail> {
  const stepContext =
    stepNumber === 1
      ? "This is the first cold email. Be curious and concise."
      : stepNumber === 2
        ? "This is a follow-up. Acknowledge no reply, add a new angle."
        : "This is the final follow-up. Keep it short, low pressure, easy to reply to."

  const systemPrompt = `You are an expert B2B cold email copywriter.
Rules:
- Maximum 150 words in the body
- No generic openers like "Hope this finds you well"
- No fake compliments
- One clear CTA at the end
- Conversational, human tone — not salesy
Return JSON with keys: subject, body, reasoning`

  const userPrompt = `Write email step ${stepNumber} for this lead.
Campaign goal: ${campaignGoal}
Step context: ${stepContext}

Lead:
- Name: ${lead.firstName} ${lead.lastName}
- Company: ${lead.company ?? "Unknown"}
- Role: ${lead.jobTitle ?? "Unknown"}
- Company description: ${lead.companyDesc ?? "Unknown"}
- Pain points: ${lead.painPoints ?? "Unknown"}
- Personalization notes: ${lead.enrichNotes ?? "None"}`

  return generateJSON(
    apiKey,
    systemPrompt,
    userPrompt,
    1024,
    emailResponseSchema,
    emailSchema
  )
}

const replyEmailSchema = z.object({
  subject: z.string(),
  body: z.string(),
  reasoning: z.string(),
  intent: z.enum([
    "interested",
    "question",
    "objection",
    "ooo",
    "unsubscribe",
    "other",
  ]),
})

export interface GeneratedReplyEmail {
  subject: string
  body: string
  reasoning: string
  intent:
    | "interested"
    | "question"
    | "objection"
    | "ooo"
    | "unsubscribe"
    | "other"
}

const replyEmailResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    subject: { type: SchemaType.STRING },
    body: { type: SchemaType.STRING },
    reasoning: { type: SchemaType.STRING },
    intent: {
      type: SchemaType.STRING,
      enum: [
        "interested",
        "question",
        "objection",
        "ooo",
        "unsubscribe",
        "other",
      ],
    },
  },
  required: ["subject", "body", "reasoning", "intent"],
}

export async function generateReplyEmail(
  lead: {
    firstName: string
    lastName: string
    company?: string | null
    jobTitle?: string | null
    companyDesc?: string | null
    painPoints?: string | null
    enrichNotes?: string | null
  },
  originalEmail: { subject: string; body: string },
  inboundReplyBody: string,
  campaignGoal: string,
  apiKey: string
): Promise<GeneratedReplyEmail> {
  const systemPrompt = `You are an expert B2B sales email assistant writing a reply to a lead who responded to a cold email.
Rules:
- Maximum 120 words in the body
- Directly address what the lead said in their reply
- Conversational, human tone — not salesy
- One clear CTA at the end
- Classify intent as one of: interested, question, objection, ooo, unsubscribe, other
- If they want to unsubscribe or stop emails, set intent to unsubscribe and write a brief polite acknowledgment (do not pitch)
- If out-of-office auto-reply, set intent to ooo
Return JSON with keys: subject, body, reasoning, intent`

  const userPrompt = `Campaign goal: ${campaignGoal}

Lead:
- Name: ${lead.firstName} ${lead.lastName}
- Company: ${lead.company ?? "Unknown"}
- Role: ${lead.jobTitle ?? "Unknown"}

Our original email:
Subject: ${originalEmail.subject}
Body:
${originalEmail.body}

Lead's reply:
${inboundReplyBody || "(empty reply)"}

Write a contextual reply email.`

  return generateJSON(
    apiKey,
    systemPrompt,
    userPrompt,
    1024,
    replyEmailResponseSchema,
    replyEmailSchema
  )
}
