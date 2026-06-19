import { decryptSecret, encryptSecret, isEncrypted } from "@/lib/encryption"

export function encryptIfNeeded(value: string | undefined): string | undefined {
  if (!value || value === "••••••••" || value.includes("•")) return undefined
  if (isEncrypted(value)) return value
  return encryptSecret(value)
}

export function decryptSettingsSecrets<T extends {
  geminiKey?: string | null
  gmailAppPass?: string | null
  gmailUser?: string | null
  fromName?: string | null
  fromEmail?: string | null
} | null>(settings: T) {
  if (!settings) return settings
  return {
    ...settings,
    geminiKey: decryptSecret(settings.geminiKey),
    gmailAppPass: decryptSecret(settings.gmailAppPass),
  }
}

export function getGeminiApiKey(settingsGeminiKey?: string | null): string | null {
  const decrypted = decryptSecret(settingsGeminiKey)
  return decrypted ?? process.env.GEMINI_API_KEY ?? null
}
