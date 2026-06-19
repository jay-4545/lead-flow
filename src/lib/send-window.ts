const DAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

export interface SendWindowConfig {
  sendingDays: string[]
  sendingStartHour: number
  sendingEndHour: number
  timezone: string
}

function getZonedParts(date: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "numeric",
    hour12: false,
  })
  const parts = formatter.formatToParts(date)
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Mon"
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10)
  return { weekday, hour: hour === 24 ? 0 : hour }
}

export function isWithinSendWindow(
  date: Date,
  config: SendWindowConfig
): boolean {
  const { weekday, hour } = getZonedParts(date, config.timezone)
  const dayNum = DAY_MAP[weekday]
  const allowedDays = config.sendingDays
    .map((d) => DAY_MAP[d])
    .filter((d) => d !== undefined)

  if (!allowedDays.includes(dayNum)) return false
  if (config.sendingStartHour <= config.sendingEndHour) {
    return hour >= config.sendingStartHour && hour < config.sendingEndHour
  }
  return hour >= config.sendingStartHour || hour < config.sendingEndHour
}

export function getNextSendSlot(
  from: Date,
  config: SendWindowConfig
): Date {
  const candidate = new Date(from)
  for (let i = 0; i < 24 * 14; i++) {
    if (isWithinSendWindow(candidate, config)) {
      return candidate
    }
    candidate.setMinutes(candidate.getMinutes() + 15)
  }
  candidate.setDate(candidate.getDate() + 1)
  candidate.setHours(config.sendingStartHour, 0, 0, 0)
  return candidate
}
