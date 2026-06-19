"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface EmailPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subject: string
  body: string
  fromName?: string
}

export function EmailPreviewModal({
  open,
  onOpenChange,
  subject,
  body,
  fromName = "LeadFlow",
}: EmailPreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Email Preview</DialogTitle>
        </DialogHeader>
        <div className="rounded-lg border bg-white p-4 dark:bg-zinc-900">
          <div className="mb-4 border-b pb-3 text-sm">
            <p>
              <span className="text-muted-foreground">From: </span>
              {fromName}
            </p>
            <p>
              <span className="text-muted-foreground">Subject: </span>
              {subject || "(no subject)"}
            </p>
          </div>
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {body || "(no body)"}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
