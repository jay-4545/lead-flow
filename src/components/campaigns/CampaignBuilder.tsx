"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, Plus, Trash2, Eye } from "lucide-react"
import { useLeads } from "@/hooks/useLeads"
import { useCreateCampaign } from "@/hooks/useCampaigns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { EmailPreviewModal } from "@/components/campaigns/EmailPreviewModal"
import { IcpScoreBadge } from "@/components/leads/LeadBadges"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { MERGE_TAG_LABELS } from "@/lib/merge-tags"

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Australia/Sydney",
]

interface Step {
  stepNumber: number
  subject: string
  body: string
  delayDays: number
  isAiGenerated: boolean
}

export function CampaignBuilder() {
  const router = useRouter()
  const createCampaign = useCreateCampaign()
  const { data: leadsData } = useLeads({ limit: 100 })

  const [step, setStep] = useState(1)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [fromName, setFromName] = useState("")
  const [fromEmail, setFromEmail] = useState("")
  const [sendingDays, setSendingDays] = useState(["Mon", "Tue", "Wed", "Thu", "Fri"])
  const [sendingStartHour, setSendingStartHour] = useState(9)
  const [sendingEndHour, setSendingEndHour] = useState(17)
  const [timezone, setTimezone] = useState("UTC")
  const [replyMode, setReplyMode] = useState<"DISABLED" | "AUTO" | "REVIEW">("DISABLED")
  const [steps, setSteps] = useState<Step[]>([
    { stepNumber: 1, subject: "", body: "", delayDays: 0, isAiGenerated: false },
  ])
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([])
  const [leadSearch, setLeadSearch] = useState("")
  const [generatingStep, setGeneratingStep] = useState<number | null>(null)
  const [previewStep, setPreviewStep] = useState<Step | null>(null)
  const [stepToRemove, setStepToRemove] = useState<number | null>(null)

  const enrichedLeads =
    leadsData?.leads.filter(
      (l) =>
        l.isEnriched &&
        (`${l.firstName} ${l.lastName} ${l.email} ${l.company ?? ""}`)
          .toLowerCase()
          .includes(leadSearch.toLowerCase())
    ) ?? []

  async function generateWithAI(stepIndex: number) {
    const sampleLead = enrichedLeads[0]
    if (!sampleLead) return

    setGeneratingStep(stepIndex)
    try {
      const res = await fetch("/api/emails/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: sampleLead.id,
          stepNumber: stepIndex + 1,
          campaignGoal: description || name,
        }),
      })
      const data = (await res.json()) as {
        success: boolean
        data: { subject: string; body: string }
      }
      if (data.success) {
        setSteps((prev) =>
          prev.map((s, i) =>
            i === stepIndex
              ? { ...s, subject: data.data.subject, body: data.data.body, isAiGenerated: true }
              : s
          )
        )
      }
    } finally {
      setGeneratingStep(null)
    }
  }

  function addStep() {
    setSteps((prev) => [
      ...prev,
      {
        stepNumber: prev.length + 1,
        subject: "",
        body: "",
        delayDays: 3,
        isAiGenerated: false,
      },
    ])
  }

  function removeStep(index: number) {
    if (steps.length <= 1) return
    setSteps((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, stepNumber: i + 1 }))
    )
  }

  function toggleLead(id: string) {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function handleCreate() {
    const campaign = await createCampaign.mutateAsync({
      name,
      description,
      fromName: fromName || undefined,
      fromEmail: fromEmail || undefined,
      sendingDays,
      sendingStartHour,
      sendingEndHour,
      timezone,
      replyMode,
      steps,
      leadIds: selectedLeadIds,
    })
    router.push(`/campaigns/${campaign.id}`)
  }

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max items-center gap-2 px-1">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                step >= s
                  ? "bg-primary text-primary-foreground"
                  : "bg-zinc-200 text-zinc-600"
              }`}
            >
              {s}
            </div>
            <span className="hidden text-sm font-medium sm:inline">
              {s === 1 ? "Details" : s === 2 ? "Sequence" : "Leads"}
            </span>
            {s < 3 && <div className="mx-1 h-px w-6 bg-zinc-200 sm:w-8" />}
          </div>
        ))}
        </div>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Campaign Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="SaaS Founders Outreach"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Goal of this campaign..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fromName">From Name</Label>
                <Input
                  id="fromName"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fromEmail">From Email</Label>
                <Input
                  id="fromEmail"
                  type="email"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Sending Days</Label>
              <div className="flex flex-wrap gap-3">
                {DAYS.map((day) => (
                  <label key={day} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={sendingDays.includes(day)}
                      onCheckedChange={(checked) => {
                        setSendingDays((prev) =>
                          checked ? [...prev, day] : prev.filter((d) => d !== day)
                        )
                      }}
                    />
                    {day}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Send Window Start (hour)</Label>
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={sendingStartHour}
                  onChange={(e) => setSendingStartHour(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Send Window End (hour)</Label>
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={sendingEndHour}
                  onChange={(e) => setSendingEndHour(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <select
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="flex h-9 w-full cursor-pointer rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="replyMode">Reply Handling</Label>
              <select
                id="replyMode"
                value={replyMode}
                onChange={(e) =>
                  setReplyMode(e.target.value as "DISABLED" | "AUTO" | "REVIEW")
                }
                className="flex h-9 w-full cursor-pointer rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              >
                <option value="DISABLED">Stop on reply (no AI response)</option>
                <option value="AUTO">Auto-send AI reply</option>
                <option value="REVIEW">Draft AI reply for review</option>
              </select>
              <p className="text-xs text-muted-foreground">
                When a lead replies, AI can generate a contextual follow-up email.
              </p>
            </div>
            <Button
              disabled={!name}
              onClick={() => setStep(2)}
            >
              Next: Email Sequence
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Personalize with merge tags: {MERGE_TAG_LABELS.join(", ")}
          </p>
          {steps.map((emailStep, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm">Step {emailStep.stepNumber}</CardTitle>
                {steps.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setStepToRemove(index)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {index > 0 && (
                  <div className="space-y-2">
                    <Label>Send {emailStep.delayDays} days after previous</Label>
                    <Input
                      type="number"
                      min={1}
                      value={emailStep.delayDays}
                      onChange={(e) =>
                        setSteps((prev) =>
                          prev.map((s, i) =>
                            i === index
                              ? { ...s, delayDays: Number(e.target.value) }
                              : s
                          )
                        )
                      }
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input
                    value={emailStep.subject}
                    onChange={(e) =>
                      setSteps((prev) =>
                        prev.map((s, i) =>
                          i === index ? { ...s, subject: e.target.value } : s
                        )
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Body ({emailStep.body.split(/\s+/).filter(Boolean).length} words)
                  </Label>
                  {generatingStep === index ? (
                    <Skeleton className="h-32 w-full" />
                  ) : (
                    <Textarea
                      rows={6}
                      value={emailStep.body}
                      onChange={(e) =>
                        setSteps((prev) =>
                          prev.map((s, i) =>
                            i === index ? { ...s, body: e.target.value } : s
                          )
                        )
                      }
                    />
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateWithAI(index)}
                    disabled={generatingStep !== null || enrichedLeads.length === 0}
                  >
                    <Sparkles className="mr-1 h-4 w-4" />
                    Generate with AI
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewStep(emailStep)}
                  >
                    <Eye className="mr-1 h-4 w-4" />
                    Preview
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" onClick={addStep}>
            <Plus className="mr-2 h-4 w-4" />
            Add another step
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
              <Button
              disabled={!steps.every((s) => s.subject && s.body)}
              onClick={() => setStep(3)}
            >
              Next: Select Leads
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Leads ({selectedLeadIds.length} selected)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Search leads..."
              value={leadSearch}
              onChange={(e) => setLeadSearch(e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox
                checked={
                  enrichedLeads.length > 0 &&
                  enrichedLeads.every((l) => selectedLeadIds.includes(l.id))
                }
                onCheckedChange={(checked) => {
                  setSelectedLeadIds(checked ? enrichedLeads.map((l) => l.id) : [])
                }}
              />
              Select all enriched leads
            </label>
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {enrichedLeads.map((lead) => (
                <label
                  key={lead.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-zinc-50"
                >
                  <Checkbox
                    checked={selectedLeadIds.includes(lead.id)}
                    onCheckedChange={() => toggleLead(lead.id)}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {lead.firstName} {lead.lastName}
                      {(lead.icpScore ?? 0) >= 7 && (
                        <span className="ml-2 inline-block h-2 w-2 rounded-full bg-green-500" />
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {lead.company} · {lead.email}
                    </p>
                  </div>
                  <IcpScoreBadge score={lead.icpScore} />
                </label>
              ))}
              {enrichedLeads.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No enriched leads found. Enrich leads first to add them to campaigns.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                disabled={
                  !name ||
                  selectedLeadIds.length === 0 ||
                  createCampaign.isPending
                }
                onClick={handleCreate}
              >
                {createCampaign.isPending ? "Creating..." : "Create Campaign"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {previewStep && (
        <EmailPreviewModal
          open={!!previewStep}
          onOpenChange={() => setPreviewStep(null)}
          subject={previewStep.subject}
          body={previewStep.body}
          fromName={fromName}
        />
      )}

      <ConfirmDialog
        open={stepToRemove !== null}
        onOpenChange={(open) => !open && setStepToRemove(null)}
        title="Remove email step?"
        description="This step will be removed from your campaign sequence. You can add it back later if needed."
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={() => {
          if (stepToRemove !== null) {
            removeStep(stepToRemove)
            setStepToRemove(null)
          }
        }}
      />
    </div>
  )
}
