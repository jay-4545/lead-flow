import type { Metadata } from "next"
import { LeadDetailClient } from "@/components/leads/LeadDetailClient"

export const metadata: Metadata = {
  title: "Lead Details | LeadFlow",
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <LeadDetailClient id={id} />
}
