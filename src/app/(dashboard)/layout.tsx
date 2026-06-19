import { redirect } from "next/navigation"
import { SessionProvider } from "next-auth/react"
import { auth } from "@/lib/auth"
import { Providers } from "@/components/providers"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { MobileNav } from "@/components/layout/MobileNav"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  return (
    <SessionProvider session={session}>
      <Providers>
        <div className="flex h-screen overflow-hidden bg-background">
          <aside className="hidden h-screen shrink-0 md:block">
            <Sidebar />
          </aside>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <Header />
            <main className="min-h-0 flex-1 overflow-x-auto overflow-y-auto p-4 pb-24 md:p-6 md:pb-8">
              <div className="page-container">{children}</div>
            </main>
          </div>
          <MobileNav />
        </div>
      </Providers>
    </SessionProvider>
  )
}
