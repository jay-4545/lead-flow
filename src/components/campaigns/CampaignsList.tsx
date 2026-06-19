"use client"

import { useCampaigns } from "@/hooks/useCampaigns"
import { CampaignCard } from "@/components/campaigns/CampaignCard"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { Mail } from "lucide-react"
import { useRouter } from "next/navigation"

export function CampaignsList() {
  const { data: campaigns, isLoading } = useCampaigns()
  const router = useRouter()

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    )
  }

  if (!campaigns || campaigns.length === 0) {
    return (
      <EmptyState
        icon={Mail}
        title="No campaigns yet"
        description="Create your first outreach campaign to start engaging leads."
        actionLabel="Create Campaign"
        onAction={() => router.push("/campaigns/new")}
      />
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {campaigns.map((campaign) => (
        <CampaignCard key={campaign.id} campaign={campaign} />
      ))}
    </div>
  )
}
