"use client"

import { useState, useCallback } from "react"
import Papa from "papaparse"
import { Upload, Download } from "lucide-react"
import { useImportLeads } from "@/hooks/useLeads"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface LeadImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LeadImportModal({ open, onOpenChange }: LeadImportModalProps) {
  const importLeads = useImportLeads()
  const [parsedLeads, setParsedLeads] = useState<Record<string, string>[]>([])
  const [step, setStep] = useState<1 | 2>(1)
  const [error, setError] = useState("")

  const handleFile = useCallback((file: File) => {
    setError("")
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const valid = results.data.filter((row) => row.firstName && row.email)
        if (valid.length === 0) {
          setError("No valid rows found. Each row needs firstName and email.")
          return
        }
        setParsedLeads(valid)
        setStep(2)
      },
      error: () => setError("Failed to parse CSV file"),
    })
  }, [])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleImport() {
    importLeads.mutate(parsedLeads, {
      onSuccess: () => {
        onOpenChange(false)
        setStep(1)
        setParsedLeads([])
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="mx-4 max-h-[90vh] max-w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Leads from CSV</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div
            className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <Upload className="mb-4 h-10 w-10 text-muted-foreground" />
            <p className="mb-2 text-sm font-medium">Drag & drop your CSV here</p>
            <p className="mb-4 text-xs text-muted-foreground">or click to browse</p>
            <input
              type="file"
              accept=".csv"
              className="hidden"
              id="csv-upload"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
              }}
            />
            <label
              htmlFor="csv-upload"
              className="cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Browse files
            </label>
            <a
              href="/sample-leads.csv"
              download
              className="mt-4 flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <Download className="h-3 w-3" />
              Download sample CSV
            </a>
            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="mb-4 text-sm text-muted-foreground">
              Preview (first 5 rows) — {parsedLeads.length} leads total
            </p>
            <div className="max-h-60 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedLeads.slice(0, 5).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        {row.firstName} {row.lastName}
                      </TableCell>
                      <TableCell>{row.email}</TableCell>
                      <TableCell>{row.company ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 2 && (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
                <Button
                onClick={handleImport}
                disabled={importLeads.isPending}
              >
                {importLeads.isPending
                  ? "Importing..."
                  : `Import ${parsedLeads.length} Leads`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
