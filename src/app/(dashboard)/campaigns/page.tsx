import type { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"
import { CampaignsList } from "@/components/campaigns/CampaignsList"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Campaigns | LeadFlow",
}

export default function CampaignsPage() {
  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Campaigns"
        description="Create and manage your outreach sequences"
        actions={
          <Button
            nativeButton={false}
            render={<Link href="/campaigns/new" />}
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            New Campaign
          </Button>
        }
      />
      <CampaignsList />
    </div>
  )
}
