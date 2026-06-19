import type { Metadata } from "next"
import SettingsPageClient from "@/components/settings/SettingsPageClient"

export const metadata: Metadata = {
  title: "Settings | LeadFlow",
}

export default function SettingsPage() {
  return <SettingsPageClient />
}
