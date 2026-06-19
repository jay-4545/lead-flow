"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"
import type { Lead, PaginatedLeads } from "@/types"

interface LeadFilters {
  search?: string
  status?: string
  page?: number
  limit?: number
}

async function fetchLeads(filters: LeadFilters): Promise<PaginatedLeads> {
  const params = new URLSearchParams()
  if (filters.search) params.set("search", filters.search)
  if (filters.status) params.set("status", filters.status)
  if (filters.page) params.set("page", String(filters.page))
  if (filters.limit) params.set("limit", String(filters.limit))

  const res = await fetch(`/api/leads?${params}`)
  const data = (await res.json()) as { success: boolean; data: PaginatedLeads; error?: string }
  if (!data.success) throw new Error(data.error ?? "Failed to fetch leads")
  return data.data
}

export function useLeads(filters: LeadFilters = {}) {
  return useQuery({
    queryKey: ["leads", filters],
    queryFn: () => fetchLeads(filters),
  })
}

export function useLead(id: string) {
  return useQuery({
    queryKey: ["lead", id],
    queryFn: async () => {
      const res = await fetch(`/api/leads/${id}`)
      const data = (await res.json()) as { success: boolean; data: Lead; error?: string }
      if (!data.success) throw new Error(data.error ?? "Failed to fetch lead")
      return data.data
    },
    enabled: !!id,
  })
}

export function useCreateLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (lead: Partial<Lead>) => {
      const toastId = toast.loading("Creating lead...")
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead),
      })
      const data = (await res.json()) as { success: boolean; data: Lead; error?: string }
      if (!data.success) {
        toast.error(data.error ?? "Failed to create lead", { id: toastId })
        throw new Error(data.error)
      }
      toast.success("Lead created", { id: toastId })
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] })
    },
  })
}

export function useUpdateLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Lead> & { id: string }) => {
      const toastId = toast.loading("Saving lead...")
      const res = await fetch(`/api/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const result = (await res.json()) as { success: boolean; data: Lead; error?: string }
      if (!result.success) {
        toast.error(result.error ?? "Failed to update lead", { id: toastId })
        throw new Error(result.error)
      }
      toast.success("Lead updated", { id: toastId })
      return result.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] })
      queryClient.invalidateQueries({ queryKey: ["lead", variables.id] })
    },
  })
}

export function useDeleteLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const toastId = toast.loading("Deleting lead...")
      const res = await fetch(`/api/leads/${id}`, { method: "DELETE" })
      const data = (await res.json()) as { success: boolean; error?: string }
      if (!data.success) {
        toast.error(data.error ?? "Failed to delete lead", { id: toastId })
        throw new Error(data.error)
      }
      toast.success("Lead deleted", { id: toastId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] })
    },
  })
}

export function useImportLeads() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (leads: Record<string, string>[]) => {
      const toastId = toast.loading("Importing leads...")
      const res = await fetch("/api/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leads),
      })
      const data = (await res.json()) as {
        success: boolean
        data: { imported: number; skipped: number }
        error?: string
      }
      if (!data.success) {
        toast.error(data.error ?? "Import failed", { id: toastId })
        throw new Error(data.error)
      }
      toast.success(`Imported ${data.data.imported} leads`, { id: toastId })
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] })
    },
  })
}

export function useMarkReplied() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (leadId: string) => {
      const toastId = toast.loading("Marking as replied...")
      const res = await fetch(`/api/leads/${leadId}/mark-replied`, {
        method: "POST",
      })
      const data = (await res.json()) as {
        success: boolean
        data?: { replied?: boolean; alreadyReplied?: boolean }
        error?: string
      }
      if (!data.success) {
        toast.error(data.error ?? "Failed to mark as replied", { id: toastId })
        throw new Error(data.error)
      }
      toast.success(
        data.data?.alreadyReplied ? "Already marked as replied" : "Lead marked as replied — follow-ups cancelled",
        { id: toastId }
      )
    },
    onSuccess: (_, leadId) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] })
      queryClient.invalidateQueries({ queryKey: ["lead", leadId] })
      queryClient.invalidateQueries({ queryKey: ["campaigns"] })
    },
  })
}

export function useEnrichLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (leadId: string) => {
      const toastId = toast.loading("Enriching lead with AI...")
      const res = await fetch("/api/leads/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      })
      const data = (await res.json()) as { success: boolean; data: Lead; error?: string }
      if (!data.success) {
        toast.error(data.error ?? "Enrichment failed", { id: toastId })
        throw new Error(data.error)
      }
      toast.success("Lead enriched", { id: toastId })
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] })
      queryClient.invalidateQueries({ queryKey: ["lead"] })
    },
  })
}
