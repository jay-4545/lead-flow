import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
      <h1 className="text-5xl font-semibold tracking-tight text-primary">404</h1>
      <p className="text-muted-foreground">Page not found</p>
      <Button render={<Link href="/dashboard" />}>Go to Dashboard</Button>
    </div>
  )
}
