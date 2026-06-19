"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"

export interface InboundReplyItem {
  id: string
  fromEmail: string
  subject: string
  body: string
  receivedAt: string
  intent: string | null
  aiSubject: string | null
  aiBody: string | null
  aiReasoning: string | null
  status: string
  lead: {
    id: string
    firstName: string
    lastName: string
    email: string
    company: string | null
  }
  campaign: { id: string; name: string } | null
  emailLog: { subject: string }
}

export function useReplies(status?: string) {
  return useQuery({
    queryKey: ["replies", status],
    queryFn: async () => {
      const params = status ? `?status=${status}` : ""
      const res = await fetch(`/api/replies${params}`)
      const data = (await res.json()) as {
        success: boolean
        data: { replies: InboundReplyItem[]; pendingCount: number }
        error?: string
      }
      if (!data.success) throw new Error(data.error ?? "Failed to fetch replies")
      return data.data
    },
  })
}

export function useReply(id: string) {
  return useQuery({
    queryKey: ["reply", id],
    queryFn: async () => {
      const res = await fetch(`/api/replies/${id}`)
      const data = (await res.json()) as {
        success: boolean
        data: InboundReplyItem & {
          emailLog: { subject: string; body: string; sentAt: string | null }
        }
        error?: string
      }
      if (!data.success) throw new Error(data.error ?? "Failed to fetch reply")
      return data.data
    },
    enabled: !!id,
  })
}

export function useUpdateReply() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      action,
      aiSubject,
      aiBody,
    }: {
      id: string
      action: "approve" | "skip" | "update"
      aiSubject?: string
      aiBody?: string
    }) => {
      const toastId = toast.loading(
        action === "approve" ? "Sending reply..." : "Updating..."
      )
      const res = await fetch(`/api/replies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, aiSubject, aiBody }),
      })
      const data = (await res.json()) as { success: boolean; error?: string }
      if (!data.success) {
        toast.error(data.error ?? "Failed to update reply", { id: toastId })
        throw new Error(data.error)
      }
      toast.success(
        action === "approve" ? "Reply queued for sending" : "Reply updated",
        { id: toastId }
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["replies"] })
      queryClient.invalidateQueries({ queryKey: ["reply"] })
    },
  })
}

export function usePendingReplyCount() {
  return useQuery({
    queryKey: ["replies", "pending-count"],
    queryFn: async () => {
      const res = await fetch("/api/replies?status=PENDING_REVIEW")
      const data = (await res.json()) as {
        success: boolean
        data: { pendingCount: number }
      }
      if (!data.success) return 0
      return data.data.pendingCount
    },
    refetchInterval: 60000,
  })
}
