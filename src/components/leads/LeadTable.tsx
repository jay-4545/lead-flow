"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { MoreHorizontal, Check, Trash2, Pencil, Mail, Building2 } from "lucide-react"
import type { Lead } from "@/types"
import { useDeleteLead, useEnrichLead } from "@/hooks/useLeads"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { LeadStatusBadge, IcpScoreBadge } from "@/components/leads/LeadBadges"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/shared/EmptyState"
import { ResponsiveTableWrapper } from "@/components/ui/responsive-table"
import { Users } from "lucide-react"

interface LeadTableProps {
  leads: Lead[]
  isLoading: boolean
  onImport?: () => void
}

function LeadMobileCard({
  lead,
  onDelete,
  onEnrich,
  enrichPending,
}: {
  lead: Lead
  onDelete: () => void
  onEnrich: () => void
  enrichPending: boolean
}) {
  return (
    <Card className="app-surface overflow-hidden">
      <CardContent className="p-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/leads/${lead.id}`}
              className="font-semibold text-foreground hover:text-primary"
            >
              {lead.firstName} {lead.lastName}
            </Link>
            {lead.jobTitle && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {lead.jobTitle}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" />
              }
            >
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Link href={`/leads/${lead.id}`} className="flex items-center gap-2">
                  <Pencil className="h-4 w-4" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600" onClick={onDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="mb-3 space-y-1.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 truncate">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{lead.email}</span>
          </div>
          {lead.company && (
            <div className="flex items-center gap-2 truncate">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{lead.company}</span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LeadStatusBadge status={lead.status} />
          <IcpScoreBadge score={lead.icpScore} />
          {lead.isEnriched ? (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <Check className="h-3.5 w-3.5" />
              Enriched
            </span>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs text-primary"
              onClick={onEnrich}
              disabled={enrichPending}
            >
              Enrich
            </Button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {format(new Date(lead.createdAt), "MMM d")}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export function LeadTable({ leads, isLoading, onImport }: LeadTableProps) {
  const router = useRouter()
  const deleteLead = useDeleteLead()
  const enrichLead = useEnrichLead()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full md:h-12" />
        ))}
      </div>
    )
  }

  if (leads.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No leads yet"
        description="Import your first CSV or add leads manually to get started."
        actionLabel="Import CSV"
        onAction={onImport}
      />
    )
  }

  return (
    <>
      {/* Mobile card list */}
      <div className="space-y-3 md:hidden">
        {leads.map((lead) => (
          <LeadMobileCard
            key={lead.id}
            lead={lead}
            onDelete={() => setDeleteId(lead.id)}
            onEnrich={() => enrichLead.mutate(lead.id)}
            enrichPending={enrichLead.isPending}
          />
        ))}
      </div>

      {/* Desktop table */}
      <Card className="app-surface hidden md:block">
        <CardContent className="p-0">
        <ResponsiveTableWrapper>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-10 bg-muted/40">Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Job Title</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>ICP</TableHead>
                <TableHead>Enriched</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow
                  key={lead.id}
                  data-clickable
                  className="cursor-pointer"
                  onClick={() => router.push(`/leads/${lead.id}`)}
                >
                  <TableCell className="sticky left-0 z-10 bg-card font-medium">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="hover:text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {lead.firstName} {lead.lastName}
                    </Link>
                  </TableCell>
                  <TableCell>{lead.company ?? "—"}</TableCell>
                  <TableCell>{lead.jobTitle ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground lg:max-w-none max-w-[180px] truncate">
                    {lead.email}
                  </TableCell>
                  <TableCell>{lead.location ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex max-w-[200px] flex-wrap gap-1">
                      {(lead.tags ?? []).slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {(lead.tags?.length ?? 0) > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{(lead.tags?.length ?? 0) - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <LeadStatusBadge status={lead.status} />
                  </TableCell>
                  <TableCell>
                    <IcpScoreBadge score={lead.icpScore} />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {lead.isEnriched ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-primary"
                        onClick={() => enrichLead.mutate(lead.id)}
                        disabled={enrichLead.isPending}
                      >
                        Enrich →
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(lead.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon" className="h-8 w-8" />
                        }
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Link
                            href={`/leads/${lead.id}`}
                            className="flex items-center gap-2"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => setDeleteId(lead.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ResponsiveTableWrapper>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete lead?"
        description="This action cannot be undone. The lead will be permanently removed."
        confirmLabel="Delete"
        variant="destructive"
        loading={deleteLead.isPending}
        onConfirm={() => {
          if (deleteId) {
            deleteLead.mutate(deleteId, {
              onSuccess: () => setDeleteId(null),
            })
          }
        }}
      />
    </>
  )
}
