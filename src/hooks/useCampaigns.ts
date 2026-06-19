"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"
import type { CampaignWithStats } from "@/types"

interface CreateCampaignInput {
  name: string
  description?: string
  fromEmail?: string
  fromName?: string
  sendingDays: string[]
  sendingStartHour: number
  sendingEndHour: number
  timezone: string
  replyMode?: "DISABLED" | "AUTO" | "REVIEW"
  steps: {
    stepNumber: number
    subject: string
    body: string
    delayDays: number
    isAiGenerated: boolean
  }[]
  leadIds: string[]
}

export function useCampaigns() {
  return useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const res = await fetch("/api/campaigns")
      const data = (await res.json()) as {
        success: boolean
        data: CampaignWithStats[]
        error?: string
      }
      if (!data.success) throw new Error(data.error ?? "Failed to fetch campaigns")
      return data.data
    },
  })
}

export function useCampaign(id: string) {
  return useQuery({
    queryKey: ["campaign", id],
    queryFn: async () => {
      const res = await fetch(`/api/campaigns/${id}`)
      const data = (await res.json()) as {
        success: boolean
        data: CampaignWithStats
        error?: string
      }
      if (!data.success) throw new Error(data.error ?? "Failed to fetch campaign")
      return data.data
    },
    enabled: !!id,
  })
}

export function useCreateCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateCampaignInput) => {
      const toastId = toast.loading("Creating campaign...")
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      const data = (await res.json()) as {
        success: boolean
        data: CampaignWithStats
        error?: string
      }
      if (!data.success) {
        toast.error(data.error ?? "Failed to create campaign", { id: toastId })
        throw new Error(data.error)
      }
      toast.success("Campaign created", { id: toastId })
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] })
    },
  })
}

export function useLaunchCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const toastId = toast.loading("Launching campaign...")
      const res = await fetch(`/api/campaigns/${id}/launch`, { method: "POST" })
      const data = (await res.json()) as {
        success: boolean
        data: { queued: number }
        error?: string
      }
      if (!data.success) {
        toast.error(data.error ?? "Failed to launch campaign", { id: toastId })
        throw new Error(data.error)
      }
      toast.success(`Campaign launched — ${data.data.queued} emails queued`, {
        id: toastId,
      })
      return data.data
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] })
      queryClient.invalidateQueries({ queryKey: ["campaign", id] })
    },
  })
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string
      status?: string
      name?: string
      description?: string
      sendingDays?: string[]
      sendingStartHour?: number
      sendingEndHour?: number
      timezone?: string
      replyMode?: "DISABLED" | "AUTO" | "REVIEW"
      steps?: CreateCampaignInput["steps"]
    }) => {
      const toastId = toast.loading("Updating campaign...")
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const result = (await res.json()) as { success: boolean; error?: string }
      if (!result.success) {
        toast.error(result.error ?? "Failed to update campaign", { id: toastId })
        throw new Error(result.error)
      }
      toast.success("Campaign updated", { id: toastId })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] })
      queryClient.invalidateQueries({ queryKey: ["campaign", variables.id] })
    },
  })
}
