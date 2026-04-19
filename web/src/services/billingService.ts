import { apiClient as api } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'
import type { BillingSummary, PlanDetail, PlanUsage } from '@/types'

export interface CheckoutRequest {
  plan_code:     string
  billing_cycle: 'monthly' | 'yearly'
}

export interface CheckoutResponse {
  checkout_url: string
}

export interface PortalResponse {
  portal_url: string
}

export const billingService = {
  summary: (): Promise<BillingSummary> =>
    api.get(API.billing.summary).then((r) => r.data),

  plans: (): Promise<PlanDetail[]> =>
    api.get(API.billing.plans).then((r) => r.data),

  usage: (): Promise<PlanUsage> =>
    api.get(API.billing.usage).then((r) => r.data),

  createCheckoutSession: (body: CheckoutRequest): Promise<CheckoutResponse> =>
    api.post(API.billing.checkout, body).then((r) => r.data),

  createPortalSession: (): Promise<PortalResponse> =>
    api.post(API.billing.portal).then((r) => r.data),
}
