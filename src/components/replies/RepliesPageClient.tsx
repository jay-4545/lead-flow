"use client"

import { useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { MessageSquare } from "lucide-react"
import { useReplies } from "@/hooks/useReplies"
import { PageHeader } from "@/components/layout/PageHeader"
import { ReplyReviewDialog } from "@/components/replies/ReplyReviewDialog"
import { EmptyState } from "@/components/shared/EmptyState"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ResponsiveTableWrapper } from "@/components/ui/responsive-table"

export function RepliesPageClient() {
  const { data, isLoading } = useReplies("PENDING_REVIEW")
  const [reviewId, setReviewId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const openReview = (id: string) => {
    setReviewId(id)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Reply Inbox"
        description="Review AI-generated responses before sending"
      />

      <Card className="app-surface">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !data?.replies.length ? (
            <EmptyState
              icon={MessageSquare}
              title="No replies pending review"
              description="When leads reply to campaigns set to draft review, their AI responses will appear here."
            />
          ) : (
            <ResponsiveTableWrapper>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Reply</TableHead>
                    <TableHead>Intent</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.replies.map((reply) => (
                    <TableRow key={reply.id}>
                      <TableCell>
                        <Link
                          href={`/leads/${reply.lead.id}`}
                          className="font-medium hover:text-primary hover:underline"
                        >
                          {reply.lead.firstName} {reply.lead.lastName}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {reply.lead.email}
                        </p>
                      </TableCell>
                      <TableCell>
                        {reply.campaign ? (
                          <Link
                            href={`/campaigns/${reply.campaign.id}`}
                            className="hover:text-primary hover:underline"
                          >
                            {reply.campaign.name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="max-w-md">
                        <p className="truncate text-sm">{reply.body}</p>
                      </TableCell>
                      <TableCell>
                        {reply.intent ? (
                          <Badge variant="secondary">{reply.intent}</Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(reply.receivedAt), "MMM d, h:mm a")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => openReview(reply.id)}
                        >
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ResponsiveTableWrapper>
          )}
        </CardContent>
      </Card>

      <ReplyReviewDialog
        replyId={reviewId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}
