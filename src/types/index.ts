import type {
  Campaign,
  CampaignLead,
  CampaignStep,
  EmailLog,
  Lead,
  Settings,
} from "@/generated/prisma/client"

export type { Lead, Campaign, CampaignStep, CampaignLead, EmailLog, Settings }

export interface LeadWithMeta extends Lead {
  _count?: { emailLogs: number }
}

export interface CampaignWithStats extends Campaign {
  steps: CampaignStep[]
  _count?: {
    campaignLeads: number
    emailLogs: number
  }
  stats?: {
    sent: number
    opened: number
    clicked: number
    replied: number
    openRate: number
    clickRate: number
    replyRate: number
  }
}

export interface PaginatedLeads {
  leads: Lead[]
  total: number
  page: number
  totalPages: number
}

export interface DashboardStats {
  totalLeads: number
  activeCampaigns: number
  emailsSentThisMonth: number
  averageOpenRate: number
}

export interface ChartDataPoint {
  date: string
  sent: number
  opened: number
}

export interface LeadStatusBreakdown {
  status: string
  count: number
}
