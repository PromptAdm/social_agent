import { apiClient as api } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'
import type { BillingSummary, PlanDetail, PlanUsage } from '@/types'

export const billingService = {
  summary: (): Promise<BillingSummary> =>
    api.get(API.billing.summary).then((r) => r.data),

  plans: (): Promise<PlanDetail[]> =>
    api.get(API.billing.plans).then((r) => r.data),

  usage: (): Promise<PlanUsage> =>
    api.get(API.billing.usage).then((r) => r.data),
}
