"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Sparkles } from "lucide-react"
import { useLead, useUpdateLead, useEnrichLead, useMarkReplied } from "@/hooks/useLeads"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { LeadStatusBadge, IcpScoreBadge } from "@/components/leads/LeadBadges"
import type { LeadStatus } from "@/generated/prisma/client"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface LeadDetailClientProps {
  id: string
}

export function LeadDetailClient({ id }: LeadDetailClientProps) {
  const { data: lead, isLoading } = useLead(id)
  const updateLead = useUpdateLead()
  const enrichLead = useEnrichLead()
  const markReplied = useMarkReplied()
  const [form, setForm] = useState<Record<string, string> | null>(null)
  const [tagsInput, setTagsInput] = useState("")

  const current = form ?? (lead ? {
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    company: lead.company ?? "",
    jobTitle: lead.jobTitle ?? "",
    website: lead.website ?? "",
    linkedinUrl: lead.linkedinUrl ?? "",
    location: lead.location ?? "",
    industry: lead.industry ?? "",
    notes: lead.notes ?? "",
    status: lead.status,
  } : null)

  useEffect(() => {
    if (lead?.tags) setTagsInput(lead.tags.join(", "))
  }, [lead?.tags])

  if (isLoading || !current) {
    return (
      <div className="grid gap-6 xl:grid-cols-12">
        <Skeleton className="h-96 xl:col-span-8" />
        <Skeleton className="h-96 xl:col-span-4" />
        <Skeleton className="h-64 xl:col-span-12" />
      </div>
    )
  }

  const emailLogs = (lead as typeof lead & {
    emailLogs?: Array<{
      id: string
      subject: string
      body: string
      status: string
      sentAt: string | null
      isAiReply?: boolean
      createdAt: string
      campaign?: { name: string }
    }>
    inboundReplies?: Array<{
      id: string
      subject: string
      body: string
      receivedAt: string
      intent: string | null
      status: string
      aiSubject: string | null
      aiBody: string | null
      campaign?: { name: string }
      emailLog?: { subject: string; sentAt: string | null }
      responseEmailLog?: {
        subject: string
        body: string
        status: string
        sentAt: string | null
      } | null
    }>
  })?.emailLogs ?? []

  const inboundReplies =
    (lead as typeof lead & {
      inboundReplies?: Array<{
        id: string
        subject: string
        body: string
        receivedAt: string
        intent: string | null
        status: string
        aiSubject: string | null
        aiBody: string | null
        campaign?: { name: string }
        emailLog?: { subject: string; sentAt: string | null }
        responseEmailLog?: {
          subject: string
          body: string
          status: string
          sentAt: string | null
        } | null
      }>
    })?.inboundReplies ?? []

  type ThreadItem = {
    id: string
    type: "sent" | "inbound" | "ai_draft" | "ai_sent"
    date: Date
    subject: string
    body: string
    meta?: string
    status?: string
  }

  const thread: ThreadItem[] = []

  for (const log of emailLogs) {
    if (log.sentAt) {
      thread.push({
        id: `sent-${log.id}`,
        type: log.isAiReply ? "ai_sent" : "sent",
        date: new Date(log.sentAt),
        subject: log.subject,
        body: log.body,
        meta: log.campaign?.name,
        status: log.status,
      })
    }
  }

  for (const reply of inboundReplies) {
    thread.push({
      id: `inbound-${reply.id}`,
      type: "inbound",
      date: new Date(reply.receivedAt),
      subject: reply.subject,
      body: reply.body,
      meta: reply.campaign?.name,
      status: reply.intent ?? undefined,
    })
    if (reply.responseEmailLog?.sentAt) {
      thread.push({
        id: `ai-sent-${reply.id}`,
        type: "ai_sent",
        date: new Date(reply.responseEmailLog.sentAt),
        subject: reply.responseEmailLog.subject,
        body: reply.responseEmailLog.body,
        status: reply.responseEmailLog.status,
      })
    } else if (reply.aiBody && reply.status === "PENDING_REVIEW") {
      thread.push({
        id: `ai-draft-${reply.id}`,
        type: "ai_draft",
        date: new Date(reply.receivedAt),
        subject: reply.aiSubject ?? "AI Draft",
        body: reply.aiBody,
        status: "PENDING_REVIEW",
      })
    }
  }

  thread.sort((a, b) => a.date.getTime() - b.date.getTime())

  return (
    <div className="space-y-6">
    <div className="grid gap-6 xl:grid-cols-12">
      <Card className="app-surface xl:col-span-8">
        <CardHeader>
          <CardTitle>Lead Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>First Name</Label>
              <Input
                value={current.firstName}
                onChange={(e) =>
                  setForm({ ...current, firstName: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input
                value={current.lastName}
                onChange={(e) =>
                  setForm({ ...current, lastName: e.target.value })
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={current.email}
              onChange={(e) => setForm({ ...current, email: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Company</Label>
              <Input
                value={current.company}
                onChange={(e) => setForm({ ...current, company: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Job Title</Label>
              <Input
                value={current.jobTitle}
                onChange={(e) => setForm({ ...current, jobTitle: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Website</Label>
              <Input
                value={current.website}
                onChange={(e) => setForm({ ...current, website: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Industry</Label>
              <Input
                value={current.industry}
                onChange={(e) => setForm({ ...current, industry: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>LinkedIn</Label>
              <Input
                value={current.linkedinUrl}
                onChange={(e) => setForm({ ...current, linkedinUrl: e.target.value })}
                placeholder="https://linkedin.com/in/..."
              />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={current.location}
                onChange={(e) => setForm({ ...current, location: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tags (comma-separated)</Label>
            <Input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="saas, founder, priority"
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={current.status}
              onValueChange={(v) =>
                setForm({ ...current, status: v ?? "NEW" })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["NEW", "CONTACTED", "REPLIED", "INTERESTED", "NOT_INTERESTED", "CONVERTED", "UNSUBSCRIBED"].map(
                  (s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace("_", " ")}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={current.notes}
              onChange={(e) => setForm({ ...current, notes: e.target.value })}
              rows={3}
            />
          </div>
          <Button
            disabled={updateLead.isPending}
            onClick={() =>
              updateLead.mutate({
                id,
                ...current,
                status: current.status as LeadStatus,
                tags: tagsInput
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
          >
            {updateLead.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-6 xl:col-span-4">
        <Card className="app-surface">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>AI Enrichment</CardTitle>
            {lead?.isEnriched && <IcpScoreBadge score={lead.icpScore} />}
          </CardHeader>
          <CardContent>
            {lead?.isEnriched ? (
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">Company</p>
                  <p>{lead.companyDesc}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Pain Points</p>
                  <p>{lead.painPoints}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Notes</p>
                  <p>{lead.enrichNotes}</p>
                </div>
                {lead.enrichedAt && (
                  <p className="text-xs text-muted-foreground">
                    Enriched {format(new Date(lead.enrichedAt), "MMM d, yyyy")}
                  </p>
                )}
              </div>
            ) : (
              <Button
                className="w-full"
                onClick={() => enrichLead.mutate(id)}
                disabled={enrichLead.isPending}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {enrichLead.isPending ? "Enriching..." : "Enrich This Lead"}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="app-surface">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>Activity</CardTitle>
            {lead?.status !== "REPLIED" &&
              emailLogs.some((l) =>
                ["SENT", "OPENED", "CLICKED"].includes(l.status)
              ) && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={markReplied.isPending}
                  onClick={() => markReplied.mutate(id)}
                >
                  {markReplied.isPending ? "Updating..." : "Mark as Replied"}
                </Button>
              )}
          </CardHeader>
          <CardContent>
            {emailLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No email activity yet.</p>
            ) : (
              <div className="space-y-3">
                {emailLogs.map((log) => (
                  <div key={log.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{log.subject}</p>
                      <Badge variant="secondary">{log.status}</Badge>
                    </div>
                    {log.campaign && (
                      <p className="text-xs text-muted-foreground">
                        {log.campaign.name}
                      </p>
                    )}
                    {log.sentAt && (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.sentAt), "MMM d, yyyy h:mm a")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>

      <Card className="app-surface">
        <CardHeader>
          <CardTitle>Conversation</CardTitle>
        </CardHeader>
        <CardContent>
          {thread.length === 0 ? (
            <p className="text-sm text-muted-foreground">No conversation yet.</p>
          ) : (
            <div className="space-y-4">
              {thread.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-md border p-4 text-sm ${
                    item.type === "inbound"
                      ? "border-blue-200 bg-blue-50/50"
                      : item.type === "ai_draft"
                        ? "border-amber-200 bg-amber-50/50"
                        : "bg-muted/20"
                  }`}
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {item.type === "sent"
                          ? "Sent"
                          : item.type === "inbound"
                            ? "Lead Reply"
                            : item.type === "ai_draft"
                              ? "AI Draft"
                              : "AI Reply"}
                      </Badge>
                      {item.status && (
                        <span className="text-xs text-muted-foreground">
                          {item.status}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(item.date, "MMM d, yyyy h:mm a")}
                    </span>
                  </div>
                  {item.meta && (
                    <p className="mb-1 text-xs text-muted-foreground">{item.meta}</p>
                  )}
                  <p className="font-medium">{item.subject}</p>
                  <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
