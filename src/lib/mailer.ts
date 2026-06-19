import nodemailer from "nodemailer"

export function createTransporter(gmailUser: string, gmailAppPass: string) {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: gmailAppPass,
    },
  })
}

export interface SendEmailParams {
  to: string
  from: string
  fromName: string
  subject: string
  html: string
  openTrackToken: string
  clickTrackToken: string
  gmailUser: string
  gmailAppPass: string
  messageId: string
  unsubscribeToken?: string
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL

  const unsubscribeFooter = params.unsubscribeToken
    ? `<p style="margin-top:24px;font-size:12px;color:#888;">
        <a href="${APP_URL}/api/emails/unsubscribe?token=${params.unsubscribeToken}&redirect=${encodeURIComponent(`${APP_URL}/unsubscribed`)}">Unsubscribe</a>
      </p>`
    : ""

  const trackedHtml = `
    ${params.html}
    ${unsubscribeFooter}
    <img 
      src="${APP_URL}/api/emails/track/open?token=${params.openTrackToken}" 
      width="1" height="1" style="display:none" 
      alt=""
    />
  `

  const linkedHtml = trackedHtml.replace(
    /href="(https?:\/\/[^"]+)"/g,
    (_, url: string) => {
      const encoded = encodeURIComponent(url)
      return `href="${APP_URL}/api/emails/track/click?token=${params.clickTrackToken}&url=${encoded}"`
    }
  )

  const transporter = createTransporter(params.gmailUser, params.gmailAppPass)

  await transporter.sendMail({
    from: `"${params.fromName}" <${params.from}>`,
    to: params.to,
    subject: params.subject,
    html: linkedHtml,
    messageId: params.messageId,
    headers: {
      "X-LeadFlow-Log": params.messageId.replace(/^<|>$/g, "").split("@")[0],
    },
  })
}

export async function testConnection(
  gmailUser: string,
  gmailAppPass: string
): Promise<boolean> {
  try {
    const transporter = createTransporter(gmailUser, gmailAppPass)
    await transporter.verify()
    return true
  } catch {
    return false
  }
}
