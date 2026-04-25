'use client'

import { useEffect, useState, useCallback } from 'react'
import { adminService, type SubscriptionRow } from '@/services/adminService'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-slate-400 text-[11px]">—</span>
  const map: Record<string, string> = {
    active:    'bg-emerald-100 text-emerald-700',
    trialing:  'bg-blue-100 text-blue-700',
    past_due:  'bg-amber-100 text-amber-700',
    canceled:  'bg-slate-100 text-slate-500',
    cancelled: 'bg-slate-100 text-slate-500',
    unpaid:    'bg-red-100 text-red-700',
  }
  const cls = map[status] ?? 'bg-slate-100 text-slate-500'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
      {status}
    </span>
  )
}

// ── Subscriptions Tab ─────────────────────────────────────────────────────────

function SubscriptionsTab() {
  const [rows,    setRows]    = useState<SubscriptionRow[]>([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(0)
  const [status,  setStatus]  = useState('')
  const [loading, setLoading] = useState(false)
  const limit = 50

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminService.listSubscriptions({
        status: status || undefined,
        limit,
        offset: page * limit,
      })
      setRows(res.subscriptions)
      setTotal(res.total)
    } finally {
      setLoading(false)
    }
  }, [status, page])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(0) }, [status])

  const pages = Math.ceil(total / limit)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="text-[12px] border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="trialing">Trialing</option>
          <option value="past_due">Past due</option>
          <option value="canceled">Canceled</option>
          <option value="unpaid">Unpaid</option>
        </select>
        <button onClick={load} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors" title="Refresh">
          <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <span className="text-[11px] text-slate-400 ml-auto">{total} subscriptions</span>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['User', 'Plan', 'Status', 'Cycle', 'Period End', 'Trial End', 'Stripe Sub'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-500 text-[10px] uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-400">Loading…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-400">No subscriptions found</td></tr>
              )}
              {!loading && rows.map((row) => (
                <tr key={row.user_id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-slate-800 truncate max-w-[160px]">{row.email ?? '—'}</div>
                    {row.full_name && <div className="text-slate-400 text-[10px] truncate max-w-[160px]">{row.full_name}</div>}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="capitalize font-medium text-slate-700">{row.plan_code}</span>
                  </td>
                  <td className="px-3 py-2.5"><StatusBadge status={row.status} /></td>
                  <td className="px-3 py-2.5 text-slate-600 capitalize">{row.billing_cycle ?? '—'}</td>
                  <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{fmtDate(row.current_period_end)}</td>
                  <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{fmtDate(row.trial_ends_at)}</td>
                  <td className="px-3 py-2.5">
                    {row.stripe_subscription_id
                      ? <span className="font-mono text-[10px] text-slate-500">{row.stripe_subscription_id.slice(0, 20)}…</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 bg-slate-50">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1 rounded hover:bg-slate-200 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <span className="text-[11px] text-slate-500">Page {page + 1} / {pages}</span>
            <button
              onClick={() => setPage(p => Math.min(pages - 1, p + 1))}
              disabled={page >= pages - 1}
              className="p-1 rounded hover:bg-slate-200 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Webhook Logs Tab ──────────────────────────────────────────────────────────

interface WebhookLog {
  id:           number
  event_type:   string
  stripe_event_id: string
  payload:      string | null
  error:        string | null
  processed_at: string
}

function WebhookLogsTab() {
  const [rows,    setRows]    = useState<WebhookLog[]>([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(0)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(null)
  const limit = 100

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminService.listWebhookLogs({ limit, offset: page * limit })
      setRows((res as any).logs ?? res)
      setTotal((res as any).total ?? (res as any).length ?? 0)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { load() }, [load])

  const pages = Math.ceil(total / limit)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={load} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors" title="Refresh">
          <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <span className="text-[11px] text-slate-400 ml-auto">{total} events</span>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Stripe Event ID', 'Type', 'Status', 'Processed At'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-500 text-[10px] uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && (
                <tr><td colSpan={4} className="px-3 py-8 text-center text-slate-400">Loading…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-8 text-center text-slate-400">No webhook logs</td></tr>
              )}
              {!loading && rows.map((row) => (
                <>
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                  >
                    <td className="px-3 py-2.5 font-mono text-[10px] text-slate-500">{row.stripe_event_id}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-700">{row.event_type}</td>
                    <td className="px-3 py-2.5">
                      {row.error
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">Error</span>
                        : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">OK</span>}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{fmtDate(row.processed_at)}</td>
                  </tr>
                  {expanded === row.id && (
                    <tr key={`${row.id}-detail`} className="bg-slate-50">
                      <td colSpan={4} className="px-4 py-3">
                        {row.error && (
                          <div className="mb-2 text-[11px] text-red-600 font-medium">Error: {row.error}</div>
                        )}
                        {row.payload && (
                          <pre className="text-[10px] text-slate-600 overflow-x-auto whitespace-pre-wrap bg-white border border-slate-100 rounded-lg p-3 max-h-48">
                            {JSON.stringify(JSON.parse(row.payload), null, 2)}
                          </pre>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 bg-slate-50">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1 rounded hover:bg-slate-200 disabled:opacity-40 transition-colors">
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <span className="text-[11px] text-slate-500">Page {page + 1} / {pages}</span>
            <button onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1} className="p-1 rounded hover:bg-slate-200 disabled:opacity-40 transition-colors">
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Credit Purchases Tab ───────────────────────────────────────────────────────

interface CreditPurchase {
  id:               number
  user_id:          number
  email:            string | null
  package_code:     string
  credits_amount:   number
  price_brl_cents:  number
  stripe_session_id: string | null
  created_at:       string
}

function fmtBrl(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
}

function CreditPurchasesTab() {
  const [rows,    setRows]    = useState<CreditPurchase[]>([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(0)
  const [loading, setLoading] = useState(false)
  const limit = 50

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminService.listCreditPurchases({ limit, offset: page * limit })
      setRows((res as any).purchases ?? res)
      setTotal((res as any).total ?? (res as any).length ?? 0)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { load() }, [load])

  const pages = Math.ceil(total / limit)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={load} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors" title="Refresh">
          <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <span className="text-[11px] text-slate-400 ml-auto">{total} purchases</span>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['User', 'Package', 'Credits', 'Amount', 'Stripe Session', 'Date'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-500 text-[10px] uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400">Loading…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400">No credit purchases yet</td></tr>
              )}
              {!loading && rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-slate-800">{row.email ?? `#${row.user_id}`}</div>
                  </td>
                  <td className="px-3 py-2.5 text-slate-600 capitalize">{row.package_code.replace('_', ' ')}</td>
                  <td className="px-3 py-2.5 font-semibold text-violet-700">{row.credits_amount.toLocaleString('pt-BR')}</td>
                  <td className="px-3 py-2.5 font-medium text-emerald-700">{fmtBrl(row.price_brl_cents)}</td>
                  <td className="px-3 py-2.5">
                    {row.stripe_session_id
                      ? <span className="font-mono text-[10px] text-slate-500">{row.stripe_session_id.slice(0, 20)}…</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{fmtDate(row.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 bg-slate-50">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1 rounded hover:bg-slate-200 disabled:opacity-40 transition-colors">
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <span className="text-[11px] text-slate-500">Page {page + 1} / {pages}</span>
            <button onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1} className="p-1 rounded hover:bg-slate-200 disabled:opacity-40 transition-colors">
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'subscriptions',   label: 'Subscriptions' },
  { id: 'credits',         label: 'Credit Purchases' },
  { id: 'webhooks',        label: 'Webhook Logs' },
]

export default function AdminBillingPage() {
  const [tab, setTab] = useState('subscriptions')

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Billing Operations</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">Super Admin · Subscriptions, credits & webhook events</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
              tab === t.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'subscriptions' && <SubscriptionsTab />}
      {tab === 'credits'       && <CreditPurchasesTab />}
      {tab === 'webhooks'      && <WebhookLogsTab />}
    </div>
  )
}
