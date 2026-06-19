"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { Menu, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Sidebar } from "@/components/layout/Sidebar"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/leads": "Leads",
  "/campaigns": "Campaigns",
  "/settings": "Settings",
}

function getPageTitle(pathname: string): string {
  if (pathname.startsWith("/leads/")) return "Lead Details"
  if (pathname.startsWith("/campaigns/new")) return "New Campaign"
  if (pathname.startsWith("/campaigns/")) return "Campaign Details"
  return pageTitles[pathname] ?? "LeadFlow"
}

export function Header() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const [signOutOpen, setSignOutOpen] = useState(false)

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "U"

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur-lg md:h-16 md:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
                aria-label="Open menu"
              />
            }
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <Sidebar onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <Link
          href="/dashboard"
          className="flex shrink-0 items-center text-primary md:hidden"
        >
          <Zap className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold tracking-tight md:text-lg">
            {getPageTitle(pathname)}
          </h1>
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 gap-2.5 px-2"
              aria-label="User menu"
            />
          }
        >
          <span className="hidden max-w-[140px] truncate text-sm text-muted-foreground lg:inline">
            {session?.user?.name}
          </span>
          <Avatar className="h-8 w-8 ring-2 ring-border">
            <AvatarFallback className="bg-primary text-xs font-medium text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">{session?.user?.name}</p>
            <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setSignOutOpen(true)}>
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={signOutOpen}
        onOpenChange={setSignOutOpen}
        title="Sign out?"
        description="You will be logged out of your account and redirected to the login page."
        confirmLabel="Sign out"
        onConfirm={() => signOut({ callbackUrl: "/login" })}
      />
    </header>
  )
}
