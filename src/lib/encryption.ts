import { createCipheriv, createDecipheriv, randomBytes } from "crypto"

const ALGORITHM = "aes-256-gcm"
const PREFIX = "enc:v1:"

function getEncryptionKey(): Buffer | null {
  const key = process.env.ENCRYPTION_KEY
  if (!key) return null
  try {
    const buf = Buffer.from(key, "base64")
    if (buf.length !== 32) return null
    return buf
  } catch {
    return null
  }
}

export function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey()
  if (!key) return plaintext

  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`
}

export function decryptSecret(value: string | null | undefined): string | null {
  if (!value) return null
  if (!value.startsWith(PREFIX)) return value

  const key = getEncryptionKey()
  if (!key) return value

  try {
    const payload = value.slice(PREFIX.length)
    const [ivB64, tagB64, dataB64] = payload.split(":")
    if (!ivB64 || !tagB64 || !dataB64) return value

    const iv = Buffer.from(ivB64, "base64")
    const tag = Buffer.from(tagB64, "base64")
    const encrypted = Buffer.from(dataB64, "base64")

    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ])
    return decrypted.toString("utf8")
  } catch {
    return value
  }
}

export function isEncrypted(value: string | null | undefined): boolean {
  return !!value?.startsWith(PREFIX)
}
