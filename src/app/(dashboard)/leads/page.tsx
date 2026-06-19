import type { Metadata } from "next"
import LeadsPageClient from "@/components/leads/LeadsPageClient"

export const metadata: Metadata = {
  title: "Leads | LeadFlow",
}

export default function LeadsPage() {
  return <LeadsPageClient />
}
