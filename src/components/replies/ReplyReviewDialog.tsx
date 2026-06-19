"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { useReply, useUpdateReply } from "@/hooks/useReplies"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

interface ReplyReviewDialogProps {
  replyId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReplyReviewDialog({
  replyId,
  open,
  onOpenChange,
}: ReplyReviewDialogProps) {
  const { data: reply, isLoading } = useReply(replyId ?? "")
  const updateReply = useUpdateReply()
  const [aiSubject, setAiSubject] = useState("")
  const [aiBody, setAiBody] = useState("")

  useEffect(() => {
    if (reply) {
      setAiSubject(reply.aiSubject ?? "")
      setAiBody(reply.aiBody ?? "")
    }
  }, [reply])

  const handleApprove = async () => {
    if (!replyId) return
    await updateReply.mutateAsync({
      id: replyId,
      action: "approve",
      aiSubject,
      aiBody,
    })
    onOpenChange(false)
  }

  const handleSkip = async () => {
    if (!replyId) return
    await updateReply.mutateAsync({ id: replyId, action: "skip" })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review AI Reply</DialogTitle>
        </DialogHeader>

        {isLoading || !reply ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-md border bg-muted/30 p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {reply.lead.firstName} {reply.lead.lastName}
                </p>
                {reply.intent && (
                  <Badge variant="secondary">{reply.intent}</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {format(new Date(reply.receivedAt), "MMM d, yyyy h:mm a")}
              </p>
              <p className="mt-3 text-sm font-medium">{reply.subject}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {reply.body}
              </p>
            </div>

            <div className="space-y-3">
              <Label>AI Draft Subject</Label>
              <Input
                value={aiSubject}
                onChange={(e) => setAiSubject(e.target.value)}
              />
              <Label>AI Draft Body</Label>
              <Textarea
                value={aiBody}
                onChange={(e) => setAiBody(e.target.value)}
                rows={8}
              />
              {reply.aiReasoning && (
                <p className="text-xs text-muted-foreground">
                  AI reasoning: {reply.aiReasoning}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleSkip}
                disabled={updateReply.isPending}
              >
                Skip
              </Button>
              <Button
                onClick={handleApprove}
                disabled={updateReply.isPending || !aiSubject || !aiBody}
              >
                Approve &amp; Send
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
