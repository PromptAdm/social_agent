'use client'

import { useEffect, useState } from 'react'
import { adminService, type AdminAnalytics } from '@/services/adminService'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) { return n.toLocaleString('pt-BR') }
function fmtBrl(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(cents)
}
function shortMonth(key: string) {
  const [y, m] = key.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleString('default', { month: 'short' })
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'}`}>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ? 'text-amber-700' : 'text-slate-900'}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function BarChart({ data, color = 'bg-violet-500' }: { data: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex items-end gap-1 h-24 mt-3">
      {data.map((d) => (
        <div key={d.label} className="flex flex-col items-center flex-1 gap-1 min-w-0">
          {d.value > 0 && <span className="text-[8px] text-slate-400">{d.value}</span>}
          <div
            className={`w-full rounded-t ${color}`}
            style={{ height: `${Math.max((d.value / max) * 100, d.value > 0 ? 4 : 1)}%` }}
          />
          <span className="text-[8px] text-slate-400 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

function FunnelView({ data }: { data: Record<string, { label: string; count: number }> }) {
  const steps = Object.values(data)
  const max   = steps[0]?.count || 1
  return (
    <div className="space-y-2 mt-2">
      {steps.map((step, i) => {
        const pct      = Math.round((step.count / max) * 100)
        const convRate = i > 0 ? Math.round((step.count / (steps[i - 1]?.count || 1)) * 100) : 100
        return (
          <div key={step.label}>
            <div className="flex justify-between text-[11px] text-slate-600 mb-1">
              <span className="font-medium">{step.label}</span>
              <span>{fmt(step.count)}{i > 0 && <span className="text-violet-600 ml-1.5">({convRate}%)</span>}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-4">
              <div className="bg-violet-500 h-4 rounded-full" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

const PLAN_COLORS: Record<string, string> = {
  starter: 'bg-blue-400', professional: 'bg-violet-500',
  premium: 'bg-amber-500', free: 'bg-slate-300', legacy: 'bg-slate-400',
}

function PlanBars({ plans }: { plans: { plan: string; count: number }[] }) {
  const total = plans.reduce((s, p) => s + p.count, 0) || 1
  return (
    <div className="space-y-2 mt-2">
      {plans.map((p) => {
        const pct   = Math.round((p.count / total) * 100)
        const color = PLAN_COLORS[p.plan] ?? 'bg-slate-400'
        return (
          <div key={p.plan}>
            <div className="flex justify-between text-[11px] text-slate-600 mb-1">
              <span className="capitalize font-medium">{p.plan}</span>
              <span>{fmt(p.count)} ({pct}%)</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3">
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
  const [data,    setData]    = useState<AdminAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    adminService.getAnalytics()
      .then(setData)
      .catch((err) => setError(err?.response?.data?.detail ?? 'Failed to load analytics'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
      Loading analytics…
    </div>
  )
  if (error) return (
    <div className="flex items-center justify-center h-64 text-red-500 text-sm">{error}</div>
  )
  if (!data)  return null

  const { kpis, charts, plan_distribution, funnel } = data

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">

      <div>
        <h1 className="text-xl font-bold text-slate-900">Platform Dashboard</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">Super Admin · Live data</p>
      </div>

      {/* Revenue KPIs */}
      <section>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Revenue</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="MRR (BRL)"    value={fmtBrl(kpis.mrr_estimate)} accent sub="monthly recurring revenue" />
          <KpiCard label="ARR (BRL)"    value={fmtBrl(kpis.arr_estimate)} accent sub="annualized MRR" />
          <KpiCard label="ARPU (BRL)"   value={fmtBrl(kpis.arpu)} sub="avg revenue per paying user" />
          <KpiCard label="Monthly Churn" value={`${kpis.churn_rate}%`} sub="cancelled / active subs" />
        </div>
      </section>

      {/* Users & Subscriptions */}
      <section>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Users & Subscriptions</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Total Users"        value={fmt(kpis.total_users)} />
          <KpiCard label="Active (30d)"        value={fmt(kpis.active_users)} sub="logged in last 30 days" />
          <KpiCard label="New This Month"      value={fmt(kpis.new_users_this_month)} />
          <KpiCard label="Active Subscriptions" value={fmt(kpis.active_subscriptions)} />
          <KpiCard label="Trial Users"         value={fmt(kpis.trial_users)} />
          <KpiCard label="Trial → Paid"        value={`${kpis.trial_conversion_rate}%`} sub="conversion rate" />
        </div>
      </section>

      {/* Credits */}
      <section>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Credits (This Month)</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Credits Sold"     value={fmt(kpis.credits_sold_this_month)} />
          <KpiCard label="Credits Consumed" value={fmt(kpis.credits_consumed_this_month)} />
        </div>
      </section>

      {/* Content */}
      <section>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Content</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Posts Generated"  value={fmt(kpis.total_posts_generated)} />
          <KpiCard label="Posts Published"  value={fmt(kpis.total_posts_published)} />
          <KpiCard label="Posts Scheduled"  value={fmt(kpis.total_posts_scheduled)} />
          <KpiCard label="Images Generated" value={fmt(kpis.total_images_generated)} />
        </div>
      </section>

      {/* Charts */}
      <section>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Trends (last 6 months)</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: 'New Users / Month',     color: 'bg-violet-500', data: charts.new_users_per_month.map(d => ({ label: shortMonth(d.month), value: d.count })) },
            { title: 'Posts Generated / Month', color: 'bg-blue-500', data: charts.posts_per_month.map(d => ({ label: shortMonth(d.month), value: d.count })) },
            { title: 'Image Projects / Month',  color: 'bg-amber-500', data: charts.images_per_month.map(d => ({ label: shortMonth(d.month), value: d.count })) },
          ].map(({ title, color, data }) => (
            <div key={title} className="bg-white rounded-xl border border-slate-100 p-4">
              <p className="text-[13px] font-semibold text-slate-700">{title}</p>
              <BarChart color={color} data={data} />
            </div>
          ))}
        </div>
      </section>

      {/* DAU */}
      <section>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <p className="text-[13px] font-semibold text-slate-700">Daily Active Users (last 30 days)</p>
          <BarChart
            color="bg-emerald-500"
            data={charts.active_users_per_day.map(d => ({ label: d.day.slice(5), value: d.count }))}
          />
        </div>
      </section>

      {/* Funnel + Plans */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <p className="text-[13px] font-semibold text-slate-700">Conversion Funnel</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Signup → Instagram → Post → Paid</p>
          <FunnelView data={funnel} />
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <p className="text-[13px] font-semibold text-slate-700">Users by Plan</p>
          <PlanBars plans={plan_distribution} />
        </div>
      </section>
    </div>
  )
}
