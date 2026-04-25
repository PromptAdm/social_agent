import { apiClient as api } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'
import type { BillingSummary, CreditsBalance, PlanDetail, PlanUsage } from '@/types'

export type PaymentMethodPreference = 'card' | 'pix'

export interface CheckoutRequest {
  plan_code:                  string
  billing_cycle:              'monthly' | 'yearly'
  payment_method_preference?: PaymentMethodPreference  // defaults to 'card'
}

export interface CheckoutResponse {
  checkout_url: string
}

export interface PortalResponse {
  portal_url: string
}

export interface CreditsCheckoutRequest {
  package_code: 'credits_100' | 'credits_500' | 'credits_1000'
}

export interface CreditsCheckoutResponse {
  checkout_url: string
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

  startTrial: (): Promise<{ trial_ends_at: string; plan_code: string; status: string }> =>
    api.post(API.billing.trialStart).then((r) => r.data),

  getCredits: (): Promise<CreditsBalance> =>
    api.get(API.billing.creditsBalance).then((r) => r.data),

  createCreditsCheckout: (body: CreditsCheckoutRequest): Promise<CreditsCheckoutResponse> =>
    api.post(API.billing.creditsCheckout, body).then((r) => r.data),
}
