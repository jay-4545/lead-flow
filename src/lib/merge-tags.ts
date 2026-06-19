export interface MergeTagLead {
  firstName: string
  lastName: string
  email: string
  company?: string | null
  jobTitle?: string | null
  website?: string | null
  location?: string | null
  industry?: string | null
}

const TAG_MAP: Record<string, (lead: MergeTagLead) => string> = {
  firstName: (l) => l.firstName,
  lastName: (l) => l.lastName,
  email: (l) => l.email,
  company: (l) => l.company ?? "",
  jobTitle: (l) => l.jobTitle ?? "",
  website: (l) => l.website ?? "",
  location: (l) => l.location ?? "",
  industry: (l) => l.industry ?? "",
  fullName: (l) => `${l.firstName} ${l.lastName}`.trim(),
}

export const MERGE_TAG_LABELS = [
  "{{firstName}}",
  "{{lastName}}",
  "{{fullName}}",
  "{{email}}",
  "{{company}}",
  "{{jobTitle}}",
  "{{website}}",
  "{{location}}",
  "{{industry}}",
]

export function applyMergeTags(template: string, lead: MergeTagLead): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, tag: string) => {
    const resolver = TAG_MAP[tag]
    return resolver ? resolver(lead) : match
  })
}
