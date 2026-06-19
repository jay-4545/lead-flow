import { ImapFlow } from "imapflow"
import { prisma } from "@/lib/prisma"
import {
  emailLogIdFromMessageId,
  extractMessageIds,
  handleInboundReply,
} from "@/lib/reply-handler"

const REPLY_LOOKBACK_DAYS = 14

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function stripSubjectPrefix(subject: string): string {
  return subject.replace(/^(re|fwd):\s*/gi, "").trim().toLowerCase()
}

function decodeQuotedPrintable(text: string): string {
  return text
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
}

function cleanReplyBody(text: string): string {
  const lines = text.split(/\r?\n/)
  const cleaned: string[] = []

  for (const line of lines) {
    if (/^On .+ wrote:$/i.test(line.trim())) break
    if (/^-{2,}\s*Original Message\s*-{2,}/i.test(line)) break
    if (/^From:\s/i.test(line) && cleaned.length > 2) break
    if (line.startsWith(">")) continue
    cleaned.push(line)
  }

  return cleaned
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 5000)
}

export function extractPlainTextBody(source: Buffer | string): string {
  const raw = typeof source === "string" ? source : source.toString("utf8")
  const decoded = decodeQuotedPrintable(raw)

  const boundaryMatch = decoded.match(
    /Content-Type:\s*multipart\/[^;]+;\s*boundary="?([^"\r\n]+)"?/i
  )

  if (boundaryMatch) {
    const boundary = boundaryMatch[1]
    const parts = decoded.split(`--${boundary}`)
    let plainText = ""
    let htmlText = ""

    for (const part of parts) {
      if (/Content-Type:\s*text\/plain/i.test(part)) {
        const bodyMatch = part.match(/\r?\n\r?\n([\s\S]*)$/)
        if (bodyMatch) plainText = bodyMatch[1]
      } else if (/Content-Type:\s*text\/html/i.test(part)) {
        const bodyMatch = part.match(/\r?\n\r?\n([\s\S]*)$/)
        if (bodyMatch) htmlText = bodyMatch[1]
      }
    }

    if (plainText) return cleanReplyBody(decodeQuotedPrintable(plainText))
    if (htmlText) return cleanReplyBody(stripHtml(decodeQuotedPrintable(htmlText)))
  }

  const plainMatch = decoded.match(
    /Content-Type:\s*text\/plain[^\r\n]*\r?\n(?:[^\r\n]*\r?\n)*\r?\n([\s\S]*?)(?:\r?\n--|\r?\nContent-Type:|$)/i
  )
  if (plainMatch) return cleanReplyBody(decodeQuotedPrintable(plainMatch[1]))

  const htmlMatch = decoded.match(
    /Content-Type:\s*text\/html[^\r\n]*\r?\n(?:[^\r\n]*\r?\n)*\r?\n([\s\S]*?)(?:\r?\n--|\r?\nContent-Type:|$)/i
  )
  if (htmlMatch) return cleanReplyBody(stripHtml(decodeQuotedPrintable(htmlMatch[1])))

  const bodyStart = decoded.indexOf("\r\n\r\n")
  if (bodyStart !== -1) {
    const body = decoded.slice(bodyStart + 4)
    if (body.includes("<html") || body.includes("<body")) {
      return cleanReplyBody(stripHtml(body))
    }
    return cleanReplyBody(body)
  }

  return ""
}

async function processReplyMatch(
  matchedLogId: string,
  message: {
    envelope?: {
      from?: Array<{ address?: string }>
      subject?: string
      date?: Date
    }
    source?: Buffer
  }
): Promise<boolean> {
  const fromAddress = message.envelope?.from?.[0]?.address ?? ""
  const replySubject = message.envelope?.subject ?? ""
  const replyBody = message.source
    ? extractPlainTextBody(message.source)
    : ""
  const receivedAt = message.envelope?.date ?? new Date()

  return handleInboundReply({
    emailLogId: matchedLogId,
    replyBody,
    replySubject,
    fromEmail: fromAddress,
    receivedAt,
  })
}

export async function checkRepliesForUser(
  userId: string,
  gmailUser: string,
  gmailAppPass: string
): Promise<{ detected: number; scanned: number }> {
  const since = new Date()
  since.setDate(since.getDate() - REPLY_LOOKBACK_DAYS)

  const sentLogs = await prisma.emailLog.findMany({
    where: {
      lead: { userId },
      status: { in: ["SENT", "OPENED", "CLICKED"] },
      sentAt: { gte: since },
      repliedAt: null,
    },
    select: {
      id: true,
      subject: true,
      toEmail: true,
      campaignId: true,
    },
  })

  if (sentLogs.length === 0) return { detected: 0, scanned: 0 }

  const logsByLeadEmail = new Map<string, (typeof sentLogs)[0][]>()

  for (const log of sentLogs) {
    const key = normalizeEmail(log.toEmail)
    const existing = logsByLeadEmail.get(key) ?? []
    existing.push(log)
    logsByLeadEmail.set(key, existing)
  }

  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: {
      user: gmailUser,
      pass: gmailAppPass.replace(/\s/g, ""),
    },
    logger: false,
  })

  let detected = 0
  let scanned = 0

  try {
    await client.connect()
    const lock = await client.getMailboxLock("INBOX")

    try {
      const messages = client.fetch({ since }, { envelope: true, source: true })

      for await (const message of messages) {
        scanned++
        const fromAddress = message.envelope?.from?.[0]?.address
        if (!fromAddress) continue

        const fromEmail = normalizeEmail(fromAddress)
        const candidateIds = new Set<string>()

        const inReplyTo = message.envelope?.inReplyTo
        if (inReplyTo) {
          const replyIds = Array.isArray(inReplyTo) ? inReplyTo : [inReplyTo]
          for (const ref of replyIds) {
            for (const id of extractMessageIds(ref)) {
              const logId = emailLogIdFromMessageId(id)
              if (logId) candidateIds.add(logId)
            }
          }
        }

        if (message.source) {
          const raw = message.source.toString()
          const referencesMatch = raw.match(/^References:\s*(.+)$/im)
          if (referencesMatch) {
            for (const id of extractMessageIds(referencesMatch[1])) {
              const logId = emailLogIdFromMessageId(id)
              if (logId) candidateIds.add(logId)
            }
          }
        }

        for (const logId of candidateIds) {
          const matched = sentLogs.find((l) => l.id === logId)
          if (matched && (await processReplyMatch(matched.id, message))) {
            detected++
            break
          }
        }

        if (candidateIds.size > 0) continue

        const leadLogs = logsByLeadEmail.get(fromEmail)
        if (!leadLogs?.length) continue

        const replySubject = message.envelope?.subject ?? ""
        const normalizedReplySubject = stripSubjectPrefix(replySubject)

        const subjectMatch = leadLogs.find((log) => {
          const sentSubject = stripSubjectPrefix(log.subject)
          return (
            normalizedReplySubject.includes(sentSubject) ||
            sentSubject.includes(normalizedReplySubject)
          )
        })

        const matchedLog = subjectMatch ?? leadLogs[leadLogs.length - 1]

        if (matchedLog && (await processReplyMatch(matchedLog.id, message))) {
          detected++
        }
      }
    } finally {
      lock.release()
    }
  } finally {
    await client.logout().catch(() => {})
  }

  return { detected, scanned }
}
