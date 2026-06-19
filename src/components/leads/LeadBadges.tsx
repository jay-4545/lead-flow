import type { LeadStatus } from "@/generated/prisma/client"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const statusColors: Record<LeadStatus, string> = {
  NEW: "bg-blue-100 text-blue-800",
  CONTACTED: "bg-yellow-100 text-yellow-800",
  REPLIED: "bg-green-100 text-green-800",
  INTERESTED: "bg-emerald-100 text-emerald-800",
  NOT_INTERESTED: "bg-red-100 text-red-800",
  CONVERTED: "bg-primary/10 text-primary",
  UNSUBSCRIBED: "bg-gray-100 text-gray-800",
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <Badge variant="secondary" className={cn("font-medium", statusColors[status])}>
      {status.replace("_", " ")}
    </Badge>
  )
}

export function IcpScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-muted-foreground">—</span>

  const color =
    score >= 7
      ? "text-green-600 bg-green-50"
      : score >= 4
        ? "text-yellow-600 bg-yellow-50"
        : "text-red-600 bg-red-50"

  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", color)}>
      {score}/10
    </span>
  )
}
