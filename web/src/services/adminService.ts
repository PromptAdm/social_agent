import { apiClient as api } from '@/lib/api/client'

const BASE = '/admin'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdminKpis {
  total_users:                number
  active_users:               number
  new_users_this_month:       number
  active_subscriptions:       number
  trial_users:                number
  trial_conversion_rate:      number
  mrr_estimate:               number
  arr_estimate:               number
  churn_rate:                 number
  credits_sold_this_month:    number
  credits_consumed_this_month: number
  arpu:                       number
  total_posts_generated:      number
  total_posts_published:      number
  total_posts_scheduled:      number
  total_images_generated:     number
}

export interface AdminAnalytics {
  kpis:              AdminKpis
  charts: {
    new_users_per_month:  { month: string; count: number }[]
    posts_per_month:      { month: string; count: number }[]
    images_per_month:     { month: string; count: number }[]
    active_users_per_day: { day: string; count: number }[]
  }
  plan_distribution: { plan: string; count: number }[]
  funnel: Record<string, { label: string; count: number }>
}

export interface CustomerRow {
  id:                    number
  email:                 string
  full_name:             string | null
  role:                  string | null
  is_superuser:          boolean
  is_active:             boolean
  plan_code:             string
  stripe_status:         string | null
  is_trial_active:       boolean
  trial_ends_at:         string | null
  stripe_customer_id:    string | null
  stripe_subscription_id: string | null
  current_period_end:    string | null
  credits_balance:       number
  brands_count:          number
  posts_this_month:      number
  last_login_at:         string | null
  created_at:            string
}

export interface CustomersResponse {
  total:     number
  offset:    number
  limit:     number
  customers: CustomerRow[]
}

export interface CustomerDetail {
  user: {
    id: number; email: string; full_name: string | null
    role: string | null; is_superuser: boolean; is_active: boolean
    last_login_at: string | null; created_at: string
  }
  subscription: {
    plan_code: string; status: string | null; billing_cycle: string | null
    is_trial_active: boolean; trial_ends_at: string | null; has_used_trial: boolean
    current_period_end: string | null; cancel_at_period_end: boolean
    stripe_customer_id: string | null; stripe_subscription_id: string | null
  }
  credits: { balance: number; lifetime_earned: number }
  usage:   { brands_count: number; posts_this_month: number }
  feature_overrides: {
    feature: string; enabled: boolean; reason: string | null
    expires_at: string | null; is_active: boolean
  }[]
  recent_audit_logs: {
    action_type: string; old_value: string | null; new_value: string | null
    notes: string | null; created_at: string
  }[]
}

export interface AuditLog {
  id:             number
  actor_user_id:  number | null
  target_user_id: number | null
  action_type:    string
  old_value:      string | null
  new_value:      string | null
  notes:          string | null
  created_at:     string
}

export interface SubscriptionRow {
  user_id:                number
  email:                  string | null
  full_name:              string | null
  plan_code:              string
  status:                 string
  billing_cycle:          string | null
  stripe_customer_id:     string | null
  stripe_subscription_id: string | null
  current_period_end:     string | null
  trial_ends_at:          string | null
  cancel_at_period_end:   boolean
  updated_at:             string
}

// ── Service ───────────────────────────────────────────────────────────────────

export const adminService = {
  // Analytics
  getAnalytics: (): Promise<AdminAnalytics> =>
    api.get(`${BASE}/analytics`).then((r) => r.data),

  // Customers
  listCustomers: (params?: {
    search?: string; plan?: string; sub_status?: string
    trial?: boolean; limit?: number; offset?: number
  }): Promise<CustomersResponse> =>
    api.get(`${BASE}/customers`, { params }).then((r) => r.data),

  getCustomer: (userId: number): Promise<CustomerDetail> =>
    api.get(`${BASE}/customers/${userId}`).then((r) => r.data),

  suspendUser: (userId: number) =>
    api.post(`${BASE}/customers/${userId}/suspend`).then((r) => r.data),

  reactivateUser: (userId: number) =>
    api.post(`${BASE}/customers/${userId}/reactivate`).then((r) => r.data),

  resetTrial: (userId: number) =>
    api.post(`${BASE}/customers/${userId}/reset-trial`).then((r) => r.data),

  changePlan: (userId: number, planCode: string) =>
    api.post(`${BASE}/customers/${userId}/change-plan`, { plan_code: planCode }).then((r) => r.data),

  adjustCredits: (userId: number, amount: number, reason: string) =>
    api.post(`${BASE}/customers/${userId}/credits`, { amount, reason }).then((r) => r.data),

  impersonateUser: (userId: number): Promise<{ access_token: string; user_id: number; email: string }> =>
    api.post(`${BASE}/customers/${userId}/impersonate`).then((r) => r.data),

  // Feature overrides
  listOverrides: (userId?: number) =>
    api.get(`${BASE}/feature-overrides`, { params: { user_id: userId } }).then((r) => r.data),

  setOverride: (userId: number, body: { feature: string; enabled: boolean; reason?: string; expires_at?: string | null }) =>
    api.post(`${BASE}/feature-overrides/${userId}`, body).then((r) => r.data),

  deleteOverride: (userId: number, feature: string) =>
    api.delete(`${BASE}/feature-overrides/${userId}/${feature}`).then((r) => r.data),

  // Billing
  listSubscriptions: (params?: { status?: string; limit?: number; offset?: number }): Promise<{ total: number; subscriptions: SubscriptionRow[] }> =>
    api.get(`${BASE}/billing/subscriptions`, { params }).then((r) => r.data),

  listWebhookLogs: (params?: { limit?: number; offset?: number }) =>
    api.get(`${BASE}/billing/webhook-logs`, { params }).then((r) => r.data),

  listCreditPurchases: (params?: { limit?: number; offset?: number }) =>
    api.get(`${BASE}/billing/credit-purchases`, { params }).then((r) => r.data),

  // Audit logs
  listAuditLogs: (params?: {
    actor_id?: number; target_id?: number; action?: string; limit?: number; offset?: number
  }): Promise<{ total: number; logs: AuditLog[] }> =>
    api.get(`${BASE}/audit-logs`, { params }).then((r) => r.data),
}
