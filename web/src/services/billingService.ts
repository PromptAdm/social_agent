import { apiClient as api } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'
import type { BillingSummary } from '@/types'

export const billingService = {
  summary: (): Promise<BillingSummary> =>
    api.get(API.billing.summary).then((r) => r.data),
}
