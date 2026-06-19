import type { Metadata } from "next"
import { CampaignDetailClient } from "@/components/campaigns/CampaignDetailClient"

export const metadata: Metadata = {
  title: "Campaign Details | LeadFlow",
}

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <CampaignDetailClient id={id} />
}
