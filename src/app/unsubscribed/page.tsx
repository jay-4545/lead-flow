"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function UnsubscribedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">You&apos;ve been unsubscribed</h1>
      <p className="max-w-md text-muted-foreground">
        You will no longer receive outreach emails from this sender.
      </p>
      <Button render={<Link href="/login" />}>Go to LeadFlow</Button>
    </div>
  )
}
