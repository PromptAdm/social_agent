'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { apiClient as api } from '@/lib/api/client'

// ── Types ─────────────────────────────────────────────────────────────────────

interface KPIs {
  total_users: number
  active_users: number
  new_users_this_month: number
  active_subscriptions: number
  mrr_estimate: number
  churn_rate: number
  total_posts_generated: number
  total_posts_published: number
  total_posts_scheduled: number
  total_images_generated: number
}

interface MonthlyPoint { month: string; count: number }
interface DailyPoint   { day: string;   count: number }

interface Charts {
  new_users_per_month:  MonthlyPoint[]
  posts_per_month:      MonthlyPoint[]
  images_per_month:     MonthlyPoint[]
  active_users_per_day: DailyPoint[]
}

interface FunnelStep { label: string; count: number }

interface AnalyticsData {
  kpis:              KPIs
  charts:            Charts
  plan_distribution: { plan: string; count: number }[]
  funnel:            Record<string, FunnelStep>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('pt-BR')
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function shortMonth(key: string) {
  const [year, month] = key.split('-')
  return new Date(Number(year), Number(month) - 1).toLocaleString('default', { month: 'short' })
}

// ── Bar chart (CSS-based, no dependencies) ────────────────────────────────────

function BarChart({ data, color = 'bg-violet-500' }: {
  data: { label: string; value: number }[]
  color?: string
}) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex items-end gap-1.5 h-28 mt-2">
      {data.map((d) => (
        <div key={d.label} className="flex flex-col items-center flex-1 gap-1">
          <span className="text-[9px] text-gray-400">{d.value > 0 ? d.value : ''}</span>
          <div
            className={`w-full rounded-t transition-all ${color}`}
            style={{ height: `${Math.max((d.value / max) * 100, d.value > 0 ? 4 : 1)}%` }}
          />
          <span className="text-[9px] text-gray-500 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Funnel ────────────────────────────────────────────────────────────────────

function Funnel({ data }: { data: Record<string, FunnelStep> }) {
  const steps = Object.values(data)
  const max   = steps[0]?.count || 1
  return (
    <div className="space-y-2 mt-2">
      {steps.map((step, i) => {
        const pct = Math.round((step.count / max) * 100)
        const convRate = i > 0 ? Math.round((step.count / (steps[i - 1]?.count || 1)) * 100) : 100
        return (
          <div key={step.label}>
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span className="font-medium">{step.label}</span>
              <span>{fmt(step.count)} users {i > 0 && <span className="text-violet-600 ml-1">({convRate}%)</span>}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-5">
              <div
                className="bg-violet-500 h-5 rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Plan distribution ─────────────────────────────────────────────────────────

const PLAN_COLORS: Record<string, string> = {
  starter:      'bg-blue-400',
  professional: 'bg-violet-500',
  premium:      'bg-amber-500',
  free:         'bg-gray-300',
  trialing:     'bg-emerald-400',
}

function PlanBars({ plans }: { plans: { plan: string; count: number }[] }) {
  const total = plans.reduce((s, p) => s + p.count, 0) || 1
  return (
    <div className="space-y-2 mt-2">
      {plans.map((p) => {
        const pct = Math.round((p.count / total) * 100)
        const color = PLAN_COLORS[p.plan] ?? 'bg-gray-400'
        return (
          <div key={p.plan}>
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span className="capitalize font-medium">{p.plan}</span>
              <span>{fmt(p.count)} ({pct}%)</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div className={`h-3 rounded-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminAnalyticsPage() {
  const router         = useRouter()
  const user           = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isLoading      = useAuthStore((s) => s.isLoading)

  const [data,    setData]    = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  // Guard: superuser only
  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated || !user?.is_superuser) {
      router.replace('/overview')
    }
  }, [isAuthenticated, isLoading, user, router])

  useEffect(() => {
    if (!user?.is_superuser) return
    api.get('/admin/analytics')
      .then((res) => setData(res.data))
      .catch((err) => setError(err?.response?.data?.detail ?? 'Failed to load analytics'))
      .finally(() => setLoading(false))
  }, [user])

  if (isLoading || (!data && loading)) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Loading analytics…
      </div>
    )
  }

  if (!user?.is_superuser) return null

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        {error}
      </div>
    )
  }

  if (!data) return null

  const { kpis, charts, plan_distribution, funnel } = data

  const posthogUrl = process.env.NEXT_PUBLIC_POSTHOG_KEY
    ? 'https://us.posthog.com'
    : null

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Super Admin only · Live data from database</p>
        </div>
        {posthogUrl && (
          <a
            href={posthogUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-violet-600 hover:underline flex items-center gap-1"
          >
            PostHog Dashboard →
          </a>
        )}
      </div>

      {/* KPI Grid */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Key Metrics</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard label="Total Users"         value={fmt(kpis.total_users)} />
          <KpiCard label="Active (30d)"        value={fmt(kpis.active_users)} sub="logged in last 30 days" />
          <KpiCard label="New This Month"      value={fmt(kpis.new_users_this_month)} />
          <KpiCard label="MRR (estimate)"      value={fmtMoney(kpis.mrr_estimate)} sub="active plans only" />
          <KpiCard label="Churn Rate"          value={`${kpis.churn_rate}%`} sub="cancelled / total users" />
          <KpiCard label="Active Subs"         value={fmt(kpis.active_subscriptions)} />
          <KpiCard label="Posts Generated"     value={fmt(kpis.total_posts_generated)} />
          <KpiCard label="Posts Published"     value={fmt(kpis.total_posts_published)} />
          <KpiCard label="Posts Scheduled"     value={fmt(kpis.total_posts_scheduled)} />
          <KpiCard label="Images Generated"    value={fmt(kpis.total_images_generated)} />
        </div>
      </section>

      {/* Charts row */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Trends (last 6 months)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-sm font-semibold text-gray-700">New Users / Month</p>
            <BarChart
              color="bg-violet-500"
              data={charts.new_users_per_month.map(d => ({
                label: shortMonth(d.month),
                value: d.count,
              }))}
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-sm font-semibold text-gray-700">Posts Generated / Month</p>
            <BarChart
              color="bg-blue-500"
              data={charts.posts_per_month.map(d => ({
                label: shortMonth(d.month),
                value: d.count,
              }))}
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-sm font-semibold text-gray-700">Image Projects / Month</p>
            <BarChart
              color="bg-amber-500"
              data={charts.images_per_month.map(d => ({
                label: shortMonth(d.month),
                value: d.count,
              }))}
            />
          </div>

        </div>
      </section>

      {/* Active users per day (last 14 days as a preview) */}
      <section>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-700">Daily Active Users (last 30 days)</p>
          <BarChart
            color="bg-emerald-500"
            data={charts.active_users_per_day.map(d => ({
              label: d.day.slice(5),   // show MM-DD
              value: d.count,
            }))}
          />
        </div>
      </section>

      {/* Funnel + Plan distribution */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-700">Conversion Funnel</p>
          <p className="text-xs text-gray-400 mt-0.5 mb-1">Signup → Instagram → First Post → Paid</p>
          <Funnel data={funnel} />
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-700">Users by Plan</p>
          <p className="text-xs text-gray-400 mt-0.5 mb-1">All subscriptions in database</p>
          <PlanBars plans={plan_distribution} />
        </div>

      </section>

    </div>
  )
}
