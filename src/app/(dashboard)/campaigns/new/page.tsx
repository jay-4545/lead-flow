import type { Metadata } from "next"
import { CampaignBuilder } from "@/components/campaigns/CampaignBuilder"

export const metadata: Metadata = {
  title: "New Campaign | LeadFlow",
}

export default function NewCampaignPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Create Campaign</h2>
      <CampaignBuilder />
    </div>
  )
}
