"use client"

import { useState, useEffect } from "react"
import { Plus, Upload } from "lucide-react"
import { useLeads, useCreateLead } from "@/hooks/useLeads"
import { LeadTable } from "@/components/leads/LeadTable"
import { LeadImportModal } from "@/components/leads/LeadImportModal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/layout/PageHeader"

export default function LeadsPageClient() {
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(1)
  const [importOpen, setImportOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [newLead, setNewLead] = useState({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    jobTitle: "",
  })

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading } = useLeads({
    search: debouncedSearch,
    status,
    page,
    limit: 20,
  })
  const createLead = useCreateLead()

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Leads"
        badge={data ? <Badge variant="secondary">{data.total} total</Badge> : undefined}
        actions={
          <>
            <Button
              variant="outline"
              className="flex-1 sm:flex-none"
              onClick={() => setImportOpen(true)}
            >
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
            <Button
              className="flex-1 sm:flex-none"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Lead
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Search leads..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="w-full sm:max-w-xs"
        />
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v ?? "")
            setPage(1)
          }}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            <SelectItem value="NEW">New</SelectItem>
            <SelectItem value="CONTACTED">Contacted</SelectItem>
            <SelectItem value="REPLIED">Replied</SelectItem>
            <SelectItem value="INTERESTED">Interested</SelectItem>
            <SelectItem value="NOT_INTERESTED">Not Interested</SelectItem>
            <SelectItem value="CONVERTED">Converted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <LeadTable
        leads={data?.leads ?? []}
        isLoading={isLoading}
        onImport={() => setImportOpen(true)}
      />

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      <LeadImportModal open={importOpen} onOpenChange={setImportOpen} />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="mx-4 max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input
                  value={newLead.firstName}
                  onChange={(e) =>
                    setNewLead((p) => ({ ...p, firstName: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={newLead.lastName}
                  onChange={(e) =>
                    setNewLead((p) => ({ ...p, lastName: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={newLead.email}
                onChange={(e) =>
                  setNewLead((p) => ({ ...p, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Company</Label>
              <Input
                value={newLead.company}
                onChange={(e) =>
                  setNewLead((p) => ({ ...p, company: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Job Title</Label>
              <Input
                value={newLead.jobTitle}
                onChange={(e) =>
                  setNewLead((p) => ({ ...p, jobTitle: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
              <Button
              disabled={!newLead.firstName || !newLead.email || createLead.isPending}
              onClick={() => {
                createLead.mutate(newLead, {
                  onSuccess: () => {
                    setAddOpen(false)
                    setNewLead({
                      firstName: "",
                      lastName: "",
                      email: "",
                      company: "",
                      jobTitle: "",
                    })
                  },
                })
              }}
            >
              {createLead.isPending ? "Adding..." : "Add Lead"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
