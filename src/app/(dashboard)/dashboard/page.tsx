import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { format, subDays, eachDayOfInterval, startOfMonth } from "date-fns"
import { Users, Mail, Send, TrendingUp } from "lucide-react"
import { StatsCard } from "@/components/dashboard/StatsCard"
import { CampaignChart } from "@/components/dashboard/CampaignChart"
import { LeadStatusChart } from "@/components/dashboard/LeadStatusChart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Link from "next/link"
import { ResponsiveTableWrapper } from "@/components/ui/responsive-table"
import { PageHeader } from "@/components/layout/PageHeader"

export const metadata: Metadata = {
  title: "Dashboard | LeadFlow",
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const userId = session.user.id
  const monthStart = startOfMonth(new Date())

  const [
    totalLeads,
    activeCampaigns,
    emailsSentThisMonth,
    allEmailLogs,
    leadStatusCounts,
    recentCampaigns,
    recentActivity,
  ] = await Promise.all([
    prisma.lead.count({ where: { userId } }),
    prisma.campaign.count({ where: { userId, status: "ACTIVE" } }),
    prisma.emailLog.count({
      where: {
        lead: { userId },
        sentAt: { gte: monthStart },
        status: { notIn: ["QUEUED", "FAILED"] },
      },
    }),
    prisma.emailLog.findMany({
      where: { lead: { userId }, sentAt: { not: null } },
      select: { sentAt: true, openCount: true },
    }),
    prisma.lead.groupBy({
      by: ["status"],
      where: { userId },
      _count: { status: true },
    }),
    prisma.campaign.findMany({
      where: { userId },
      include: {
        _count: { select: { campaignLeads: true } },
        emailLogs: { select: { openCount: true, status: true, repliedAt: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.emailLog.findMany({
      where: { lead: { userId } },
      include: {
        lead: { select: { firstName: true, lastName: true } },
        campaign: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ])

  const totalSent = allEmailLogs.length
  const totalOpened = allEmailLogs.filter((e) => e.openCount > 0).length
  const averageOpenRate =
    totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0

  const last30Days = eachDayOfInterval({
    start: subDays(new Date(), 29),
    end: new Date(),
  })

  const chartData = last30Days.map((day) => {
    const dateStr = format(day, "MMM d")
    const dayLogs = allEmailLogs.filter((log) => {
      if (!log.sentAt) return false
      return format(new Date(log.sentAt), "yyyy-MM-dd") === format(day, "yyyy-MM-dd")
    })
    return {
      date: dateStr,
      sent: dayLogs.length,
      opened: dayLogs.filter((l) => l.openCount > 0).length,
    }
  })

  const statusBreakdown = leadStatusCounts.map((item) => ({
    status: item.status.replace("_", " "),
    count: item._count.status,
  }))

  function getActivityDescription(log: (typeof recentActivity)[0]): string {
    const name = `${log.lead.firstName} ${log.lead.lastName}`
    const campaign = log.campaign?.name ?? "Unknown campaign"
    switch (log.status) {
      case "SENT":
        return `Email sent to ${name} in "${campaign}"`
      case "OPENED":
        return `${name} opened email in "${campaign}"`
      case "CLICKED":
        return `${name} clicked a link in "${campaign}"`
      case "QUEUED":
        return `Email queued for ${name} in "${campaign}"`
      default:
        return `Email ${log.status.toLowerCase()} for ${name}`
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Dashboard"
        description="Overview of your outreach performance"
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatsCard title="Total Leads" value={totalLeads} icon={Users} />
        <StatsCard title="Active Campaigns" value={activeCampaigns} icon={Mail} />
        <StatsCard
          title="Emails Sent This Month"
          value={emailsSentThisMonth}
          icon={Send}
        />
        <StatsCard
          title="Average Open Rate"
          value={`${averageOpenRate}%`}
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Card className="app-surface">
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg">Emails Sent vs Opened</CardTitle>
          </CardHeader>
          <CardContent className="pl-2 sm:pl-6">
            <CampaignChart data={chartData} />
          </CardContent>
        </Card>
        <Card className="app-surface">
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg">Lead Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {statusBreakdown.length > 0 ? (
              <LeadStatusChart data={statusBreakdown} />
            ) : (
              <p className="text-sm text-muted-foreground">No leads yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Card className="app-surface lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg">Recent Campaigns</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            <ResponsiveTableWrapper>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Leads</TableHead>
                  <TableHead>Open Rate</TableHead>
                  <TableHead>Reply Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentCampaigns.map((campaign) => {
                  const sent = campaign.emailLogs.filter(
                    (e) => e.status !== "QUEUED" && e.status !== "FAILED"
                  ).length
                  const opened = campaign.emailLogs.filter((e) => e.openCount > 0).length
                  const replied = campaign.emailLogs.filter((e) => e.repliedAt).length
                  const openRate = sent > 0 ? Math.round((opened / sent) * 100) : 0
                  const replyRate = sent > 0 ? Math.round((replied / sent) * 100) : 0
                  return (
                    <TableRow
                      key={campaign.id}
                      data-clickable
                      className="cursor-pointer"
                    >
                      <TableCell>
                        <Link
                          href={`/campaigns/${campaign.id}`}
                          className="font-medium hover:text-primary hover:underline"
                        >
                          {campaign.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{campaign.status}</Badge>
                      </TableCell>
                      <TableCell>{campaign._count.campaignLeads}</TableCell>
                      <TableCell>{openRate}%</TableCell>
                      <TableCell>{replyRate}%</TableCell>
                    </TableRow>
                  )
                })}
                {recentCampaigns.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No campaigns yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </ResponsiveTableWrapper>
          </CardContent>
        </Card>

        <Card className="app-surface">
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((log) => (
                <div key={log.id} className="flex items-start gap-3 text-sm">
                  <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div>
                    <p>{getActivityDescription(log)}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(log.createdAt), "MMM d, h:mm a")}
                    </p>
                  </div>
                </div>
              ))}
              {recentActivity.length === 0 && (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
