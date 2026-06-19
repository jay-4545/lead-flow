"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format, subDays, eachDayOfInterval } from "date-fns"
import Link from "next/link"
import {
  useCampaign,
  useLaunchCampaign,
  useUpdateCampaign,
} from "@/hooks/useCampaigns"
import { StatsCard } from "@/components/dashboard/StatsCard"
import { CampaignChart } from "@/components/dashboard/CampaignChart"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, MousePointer, MessageSquare, Send } from "lucide-react"
import { ResponsiveTableWrapper } from "@/components/ui/responsive-table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  ACTIVE: "bg-green-100 text-green-800",
  PAUSED: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-blue-100 text-blue-800",
  ARCHIVED: "bg-red-100 text-red-800",
}

const replyModeLabels: Record<string, string> = {
  DISABLED: "Stop on reply",
  AUTO: "Auto AI reply",
  REVIEW: "Draft for review",
}

interface CampaignDetailClientProps {
  id: string
}

export function CampaignDetailClient({ id }: CampaignDetailClientProps) {
  const router = useRouter()
  const { data: campaign, isLoading } = useCampaign(id)
  const launchCampaign = useLaunchCampaign()
  const updateCampaign = useUpdateCampaign()
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editSteps, setEditSteps] = useState<
    Array<{
      stepNumber: number
      subject: string
      body: string
      delayDays: number
      isAiGenerated: boolean
    }>
  >([])
  const [editReplyMode, setEditReplyMode] = useState<"DISABLED" | "AUTO" | "REVIEW">("DISABLED")

  useEffect(() => {
    if (!campaign) return
    setEditName(campaign.name)
    setEditDescription(campaign.description ?? "")
    setEditReplyMode(
      (campaign.replyMode as "DISABLED" | "AUTO" | "REVIEW") ?? "DISABLED"
    )
    setEditSteps(
      campaign.steps?.map((s) => ({
        stepNumber: s.stepNumber,
        subject: s.subject,
        body: s.body,
        delayDays: s.delayDays,
        isAiGenerated: s.isAiGenerated,
      })) ?? []
    )
  }, [campaign])

  if (isLoading || !campaign) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    )
  }

  const stats = campaign.stats ?? {
    sent: 0,
    opened: 0,
    clicked: 0,
    replied: 0,
    openRate: 0,
    clickRate: 0,
    replyRate: 0,
  }

  const emailLogs = (campaign as typeof campaign & {
    emailLogs?: Array<{ sentAt: string | null; openCount: number }>
  }).emailLogs ?? []

  const last30Days = eachDayOfInterval({
    start: subDays(new Date(), 29),
    end: new Date(),
  })

  const chartData = last30Days.map((day) => {
    const dateStr = format(day, "MMM d")
    const dayLogs = emailLogs.filter((log) => {
      if (!log.sentAt) return false
      return format(new Date(log.sentAt), "yyyy-MM-dd") === format(day, "yyyy-MM-dd")
    })
    return {
      date: dateStr,
      sent: dayLogs.length,
      opened: dayLogs.filter((l) => l.openCount > 0).length,
    }
  })

  const campaignLeads = (campaign as typeof campaign & {
    campaignLeads?: Array<{
      id: string
      status: string
      currentStep: number
      repliedAt: string | null
      lead: {
        id: string
        firstName: string
        lastName: string
        email: string
        company: string | null
      }
    }>
    inboundReplies?: Array<{
      id: string
      leadId: string
      body: string
      receivedAt: string
      status: string
    }>
    emailLogs?: Array<{
      leadId: string
      sentAt: string | null
      status: string
    }>
  }).campaignLeads ?? []

  const inboundReplies =
    (campaign as typeof campaign & {
      inboundReplies?: Array<{
        id: string
        leadId: string
        body: string
        receivedAt: string
        status: string
      }>
    }).inboundReplies ?? []

  const allEmailLogs =
    (campaign as typeof campaign & {
      emailLogs?: Array<{
        leadId: string
        sentAt: string | null
        status: string
      }>
    }).emailLogs ?? []

  const canLaunch =
    (campaign.status === "DRAFT" || campaign.status === "PAUSED") &&
    (campaign.steps?.length ?? 0) > 0 &&
    (campaign._count?.campaignLeads ?? campaignLeads.length) > 0

  function handleSaveDraft() {
    updateCampaign.mutate(
      {
        id,
        name: editName,
        description: editDescription,
        replyMode: editReplyMode,
        steps: editSteps,
      },
      { onSuccess: () => setEditMode(false) }
    )
  }

  function handleSaveSettings() {
    updateCampaign.mutate({ id, replyMode: editReplyMode })
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="truncate text-xl font-bold sm:text-2xl">{campaign.name}</h2>
          <Badge className={statusColors[campaign.status]}>{campaign.status}</Badge>
          <Badge variant="outline">
            {replyModeLabels[campaign.replyMode ?? "DISABLED"]}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {campaign.status === "DRAFT" && !editMode && (
            <Button variant="outline" onClick={() => setEditMode(true)}>
              Edit Campaign
            </Button>
          )}
          {editMode && (
            <>
              <Button onClick={handleSaveDraft} disabled={updateCampaign.isPending}>
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setEditMode(false)}>
                Cancel
              </Button>
            </>
          )}
          {canLaunch && !editMode && (
            <Button
              className="flex-1 sm:flex-none"
              onClick={() => launchCampaign.mutate(id)}
              disabled={launchCampaign.isPending}
            >
              {launchCampaign.isPending ? "Launching..." : "Launch"}
            </Button>
          )}
          {campaign.status === "ACTIVE" && (
            <Button
              variant="outline"
              onClick={() => updateCampaign.mutate({ id, status: "PAUSED" })}
            >
              Pause
            </Button>
          )}
          {campaign.status === "PAUSED" && (
            <Button
              variant="outline"
              onClick={() => updateCampaign.mutate({ id, status: "ACTIVE" })}
            >
              Resume
            </Button>
          )}
          {campaign.status !== "ARCHIVED" && (
            <AlertDialog>
              <AlertDialogTrigger
                render={<Button variant="outline" className="text-red-600" />}
              >
                Archive
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Archive campaign?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will archive the campaign. Queued emails will not be sent.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => updateCampaign.mutate({ id, status: "ARCHIVED" })}
                  >
                    Archive
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
        <StatsCard title="Sent" value={stats.sent} icon={Send} />
        <StatsCard title="Open Rate" value={`${stats.openRate}%`} icon={Mail} />
        <StatsCard title="Click Rate" value={`${stats.clickRate}%`} icon={MousePointer} />
        <StatsCard title="Reply Rate" value={`${stats.replyRate}%`} icon={MessageSquare} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 sm:w-auto">
          <TabsTrigger value="overview" className="flex-1 sm:flex-none">Overview</TabsTrigger>
          <TabsTrigger value="leads" className="flex-1 sm:flex-none">Leads</TabsTrigger>
          <TabsTrigger value="sequence" className="flex-1 sm:flex-none">Sequence</TabsTrigger>
          <TabsTrigger value="settings" className="flex-1 sm:flex-none">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card className="app-surface">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Emails Sent vs Opened</CardTitle>
            </CardHeader>
            <CardContent className="pl-2 sm:pl-6">
              <CampaignChart data={chartData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leads" className="mt-4">
          <Card className="app-surface">
            <CardContent className="pt-6">
              <ResponsiveTableWrapper>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Step</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Sent</TableHead>
                    <TableHead>Reply</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaignLeads.map((cl) => {
                    const leadReply = inboundReplies.find(
                      (r) => r.leadId === cl.lead.id
                    )
                    const lastSent = allEmailLogs
                      .filter(
                        (l) =>
                          l.leadId === cl.lead.id &&
                          l.sentAt &&
                          l.status !== "QUEUED"
                      )
                      .sort(
                        (a, b) =>
                          new Date(b.sentAt!).getTime() -
                          new Date(a.sentAt!).getTime()
                      )[0]

                    return (
                      <TableRow
                        key={cl.id}
                        data-clickable
                        className="cursor-pointer"
                        onClick={() => router.push(`/leads/${cl.lead.id}`)}
                      >
                        <TableCell className="font-medium">
                          <Link
                            href={`/leads/${cl.lead.id}`}
                            className="hover:text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {cl.lead.firstName} {cl.lead.lastName}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {cl.lead.email}
                        </TableCell>
                        <TableCell>{cl.lead.company ?? "—"}</TableCell>
                        <TableCell>Step {cl.currentStep}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{cl.status}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {lastSent?.sentAt
                            ? format(new Date(lastSent.sentAt), "MMM d, h:mm a")
                            : "—"}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {leadReply ? (
                            <span className="line-clamp-2 text-sm text-muted-foreground">
                              {leadReply.body}
                            </span>
                          ) : cl.repliedAt ? (
                            <span className="text-sm text-green-600">Replied</span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              </ResponsiveTableWrapper>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sequence" className="mt-4">
          <div className="space-y-4">
            {editMode
              ? editSteps.map((step, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-sm">Step {step.stepNumber}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Input
                        value={step.subject}
                        onChange={(e) =>
                          setEditSteps((prev) =>
                            prev.map((s, i) =>
                              i === index ? { ...s, subject: e.target.value } : s
                            )
                          )
                        }
                        placeholder="Subject"
                      />
                      <Textarea
                        rows={5}
                        value={step.body}
                        onChange={(e) =>
                          setEditSteps((prev) =>
                            prev.map((s, i) =>
                              i === index ? { ...s, body: e.target.value } : s
                            )
                          )
                        }
                      />
                    </CardContent>
                  </Card>
                ))
              : campaign.steps?.map((step) => (
              <Card key={step.id}>
                <CardHeader>
                  <CardTitle className="text-sm">
                    Step {step.stepNumber}
                    {step.delayDays > 0 && (
                      <span className="ml-2 text-muted-foreground font-normal">
                        (+{step.delayDays} days)
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-2 text-sm font-medium">{step.subject}</p>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {step.body}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardContent className="space-y-4 pt-6">
              {editMode ? (
                <>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Campaign Name</p>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Description</p>
                    <Textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                    />
                  </div>
                </>
              ) : (
              <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-muted-foreground">From Name</p>
                  <p>{campaign.fromName ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">From Email</p>
                  <p>{campaign.fromEmail ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Sending Days</p>
                  <p>{campaign.sendingDays.join(", ")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Send Window</p>
                  <p>
                    {campaign.sendingStartHour}:00 – {campaign.sendingEndHour}:00{" "}
                    {campaign.timezone}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="mb-2 text-muted-foreground">Reply Handling</p>
                  <select
                    value={editReplyMode}
                    onChange={(e) =>
                      setEditReplyMode(
                        e.target.value as "DISABLED" | "AUTO" | "REVIEW"
                      )
                    }
                    className="flex h-9 w-full max-w-md cursor-pointer rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  >
                    <option value="DISABLED">Stop on reply (no AI response)</option>
                    <option value="AUTO">Auto-send AI reply</option>
                    <option value="REVIEW">Draft AI reply for review</option>
                  </select>
                  <Button
                    className="mt-3"
                    size="sm"
                    onClick={handleSaveSettings}
                    disabled={updateCampaign.isPending}
                  >
                    Save Reply Settings
                  </Button>
                </div>
              </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
