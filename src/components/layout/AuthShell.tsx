import Link from "next/link"
import { Zap } from "lucide-react"

interface AuthShellProps {
  children: React.ReactNode
  title: string
  description: string
}

export function AuthShell({ children, title, description }: AuthShellProps) {
  return (
    <div className="auth-gradient flex min-h-screen">
      <div className="hidden w-[45%] flex-col justify-between border-r border-border/60 bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-sidebar-primary shadow-lg shadow-sidebar-primary/25">
            <Zap className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <span className="text-xl font-semibold tracking-tight">LeadFlow</span>
        </Link>
        <div className="space-y-4">
          <blockquote className="text-lg font-medium leading-relaxed text-sidebar-foreground/90">
            &ldquo;Automate your outreach, personalize at scale, and never miss a
            follow-up.&rdquo;
          </blockquote>
          <p className="text-sm text-sidebar-foreground/60">
            AI-powered lead outreach for modern sales teams
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/40">
          &copy; {new Date().getFullYear()} LeadFlow
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary shadow-lg shadow-primary/25">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">LeadFlow</span>
        </div>

        <div className="w-full max-w-[400px] space-y-6">
          <div className="space-y-1.5 text-center lg:text-left">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
