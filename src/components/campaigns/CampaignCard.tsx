import Link from "next/link"
import { format } from "date-fns"
import type { CampaignWithStats } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Mail, Users } from "lucide-react"

const statusColors: Record<string, string> = {
  DRAFT: "bg-zinc-100 text-zinc-700",
  ACTIVE: "bg-green-100 text-green-800",
  PAUSED: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-blue-100 text-blue-800",
  ARCHIVED: "bg-red-100 text-red-800",
}

interface CampaignCardProps {
  campaign: CampaignWithStats
}

export function CampaignCard({ campaign }: CampaignCardProps) {
  return (
    <Link href={`/campaigns/${campaign.id}`} className="block">
      <Card className="app-surface h-full transition-all hover:border-primary/30 hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-2 text-base leading-snug">
              {campaign.name}
            </CardTitle>
            <Badge className={`shrink-0 ${statusColors[campaign.status]}`}>
              {campaign.status}
            </Badge>
          </div>
          {campaign.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {campaign.description}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {campaign._count?.campaignLeads ?? 0} leads
            </span>
            <span className="flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" />
              {campaign.steps?.length ?? 0} steps
            </span>
            {campaign.stats && (
              <span className="font-medium text-primary">
                {campaign.stats.openRate}% open
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Created {format(new Date(campaign.createdAt), "MMM d, yyyy")}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}
