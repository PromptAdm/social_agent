'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Search, ChevronLeft, ChevronRight, UserX, UserCheck,
  RefreshCw, Zap, CreditCard, Copy, ArrowUpDown, MoreHorizontal,
} from 'lucide-react'
import { adminService, type CustomerRow } from '@/services/adminService'
import { cn } from '@/lib/utils/cn'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('pt-BR')
}

function StatusBadge({ status, isActive }: { status: string | null; isActive: boolean }) {
  if (!isActive) return <span className="px-2 py-0.5 text-[10px] font-semibold bg-red-100 text-red-700 rounded-full">Suspended</span>
  const map: Record<string, string> = {
    active:    'bg-emerald-100 text-emerald-700',
    trialing:  'bg-blue-100 text-blue-700',
    past_due:  'bg-orange-100 text-orange-700',
    cancelled: 'bg-slate-100 text-slate-600',
    expired:   'bg-slate-100 text-slate-500',
    free:      'bg-slate-100 text-slate-500',
  }
  const cls = map[status ?? 'free'] ?? 'bg-slate-100 text-slate-500'
  return (
    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${cls}`}>
      {status ?? 'free'}
    </span>
  )
}

const PLANS = ['starter', 'professional', 'premium', 'free', 'legacy']
const STATUSES = ['active', 'trialing', 'past_due', 'cancelled', 'expired']

// ── Action modal ──────────────────────────────────────────────────────────────

function ActionModal({
  customer,
  onClose,
  onRefresh,
}: {
  customer: CustomerRow
  onClose: () => void
  onRefresh: () => void
}) {
  const [creditAmount, setCreditAmount] = useState('')
  const [creditReason, setCreditReason] = useState('')
  const [plan, setPlan]     = useState(customer.plan_code)
  const [loading, setLoading] = useState<string | null>(null)
  const [msg, setMsg]       = useState<string | null>(null)

  async function run(action: string, fn: () => Promise<unknown>) {
    setLoading(action)
    setMsg(null)
    try {
      await fn()
      setMsg('✓ Done')
      onRefresh()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setMsg(`✗ ${err?.response?.data?.detail ?? 'Error'}`)
    } finally {
      setLoading(null)
    }
  }

  async function handleImpersonate() {
    await run('impersonate', async () => {
      const result = await adminService.impersonateUser(customer.id)
      navigator.clipboard.writeText(result.access_token)
      setMsg('✓ Token copied to clipboard — paste in browser devtools as Authorization header')
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-[15px] font-bold text-slate-900">{customer.full_name ?? customer.email}</h3>
            <p className="text-[12px] text-slate-500">{customer.email} · ID {customer.id}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none">&times;</button>
        </div>

        {msg && (
          <p className={`text-[12px] mb-3 px-3 py-2 rounded-lg ${msg.startsWith('✓') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
            {msg}
          </p>
        )}

        <div className="space-y-3">
          {/* Suspend / Reactivate */}
          <div className="flex gap-2">
            <button
              onClick={() => run('suspend', () => adminService.suspendUser(customer.id))}
              disabled={!customer.is_active || loading !== null}
              className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg border border-red-200 text-[12px] text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
            >
              {loading === 'suspend' ? '…' : <><UserX className="w-3.5 h-3.5" /> Suspend</>}
            </button>
            <button
              onClick={() => run('reactivate', () => adminService.reactivateUser(customer.id))}
              disabled={customer.is_active || loading !== null}
              className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg border border-emerald-200 text-[12px] text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 transition-colors"
            >
              {loading === 'reactivate' ? '…' : <><UserCheck className="w-3.5 h-3.5" /> Reactivate</>}
            </button>
          </div>

          {/* Reset trial */}
          <button
            onClick={() => run('trial', () => adminService.resetTrial(customer.id))}
            disabled={loading !== null}
            className="w-full flex items-center justify-center gap-1.5 h-9 rounded-lg border border-slate-200 text-[12px] text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40"
          >
            {loading === 'trial' ? '…' : <><RefreshCw className="w-3.5 h-3.5" /> Reset Trial (7 days Professional)</>}
          </button>

          {/* Change plan */}
          <div className="flex gap-2">
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="flex-1 h-9 rounded-lg border border-slate-200 text-[12px] text-slate-700 px-2 bg-white"
            >
              {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <button
              onClick={() => run('plan', () => adminService.changePlan(customer.id, plan))}
              disabled={loading !== null || plan === customer.plan_code}
              className="h-9 px-3 rounded-lg bg-indigo-600 text-white text-[12px] font-medium hover:bg-indigo-500 disabled:opacity-40 transition-colors"
            >
              {loading === 'plan' ? '…' : 'Change Plan'}
            </button>
          </div>

          {/* Adjust credits */}
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Amount (+ or -)"
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
              className="flex-1 h-9 rounded-lg border border-slate-200 text-[12px] px-3"
            />
            <input
              type="text"
              placeholder="Reason"
              value={creditReason}
              onChange={(e) => setCreditReason(e.target.value)}
              className="flex-1 h-9 rounded-lg border border-slate-200 text-[12px] px-3"
            />
            <button
              onClick={() => run('credits', () => adminService.adjustCredits(customer.id, Number(creditAmount), creditReason))}
              disabled={!creditAmount || !creditReason || loading !== null}
              className="h-9 px-3 rounded-lg bg-emerald-600 text-white text-[12px] font-medium hover:bg-emerald-500 disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              {loading === 'credits' ? '…' : <CreditCard className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Impersonate */}
          <button
            onClick={handleImpersonate}
            disabled={loading !== null}
            className="w-full flex items-center justify-center gap-1.5 h-9 rounded-lg bg-amber-50 border border-amber-200 text-[12px] text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-40"
          >
            {loading === 'impersonate' ? '…' : <><Copy className="w-3.5 h-3.5" /> Impersonate (copy token)</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50

export default function AdminCustomersPage() {
  const [customers,  setCustomers]  = useState<CustomerRow[]>([])
  const [total,      setTotal]      = useState(0)
  const [offset,     setOffset]     = useState(0)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [search,     setSearch]     = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [trialFilter, setTrialFilter]   = useState('')
  const [selected,   setSelected]   = useState<CustomerRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminService.listCustomers({
        search:     search || undefined,
        plan:       planFilter || undefined,
        sub_status: statusFilter || undefined,
        trial:      trialFilter === 'true' ? true : trialFilter === 'false' ? false : undefined,
        limit:  PAGE_SIZE,
        offset,
      })
      setCustomers(res.customers)
      setTotal(res.total)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setError(err?.response?.data?.detail ?? 'Failed to load customers')
    } finally {
      setLoading(false)
    }
  }, [search, planFilter, statusFilter, trialFilter, offset])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-slate-900">Customers</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">{total.toLocaleString('pt-BR')} total users</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search email or name…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setOffset(0) }}
              className="pl-9 pr-3 h-9 rounded-lg border border-slate-200 text-[12px] w-64 bg-white"
            />
          </div>
          <select
            value={planFilter}
            onChange={(e) => { setPlanFilter(e.target.value); setOffset(0) }}
            className="h-9 rounded-lg border border-slate-200 text-[12px] px-2 bg-white"
          >
            <option value="">All plans</option>
            {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setOffset(0) }}
            className="h-9 rounded-lg border border-slate-200 text-[12px] px-2 bg-white"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={trialFilter}
            onChange={(e) => { setTrialFilter(e.target.value); setOffset(0) }}
            className="h-9 rounded-lg border border-slate-200 text-[12px] px-2 bg-white"
          >
            <option value="">Trial: all</option>
            <option value="true">Trial: active</option>
            <option value="false">Trial: not active</option>
          </select>
          <button
            onClick={load}
            className="h-9 px-3 rounded-lg border border-slate-200 text-[12px] text-slate-600 hover:bg-slate-50 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {/* Table */}
        {error ? (
          <div className="text-red-500 text-sm py-8 text-center">{error}</div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {['Name / Email', 'Plan', 'Status', 'Trial', 'Credits', 'Brands', 'Posts/mo', 'Signup', 'Last Login', ''].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className={cn('divide-y divide-slate-50', loading && 'opacity-50')}>
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2.5 max-w-[180px]">
                        <p className="font-medium text-slate-800 truncate">{c.full_name ?? '—'}</p>
                        <p className="text-slate-400 truncate">{c.email}</p>
                        {c.is_superuser && (
                          <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">ADMIN</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="capitalize font-medium text-slate-700">{c.plan_code}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={c.stripe_status} isActive={c.is_active} />
                      </td>
                      <td className="px-3 py-2.5">
                        {c.is_trial_active
                          ? <span className="text-blue-600 font-medium">Active</span>
                          : <span className="text-slate-300">—</span>
                        }
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">{c.credits_balance}</td>
                      <td className="px-3 py-2.5 text-slate-700">{c.brands_count}</td>
                      <td className="px-3 py-2.5 text-slate-700">{c.posts_this_month}</td>
                      <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{fmtDate(c.created_at)}</td>
                      <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{fmtDate(c.last_login_at)}</td>
                      <td className="px-3 py-2.5">
                        <button
                          onClick={() => setSelected(c)}
                          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-400 transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {customers.length === 0 && !loading && (
                    <tr>
                      <td colSpan={10} className="px-3 py-12 text-center text-slate-400">
                        No customers found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                <span className="text-[11px] text-slate-400">
                  Page {currentPage} of {totalPages} · {total} total
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                    disabled={offset === 0}
                    className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setOffset(offset + PAGE_SIZE)}
                    disabled={offset + PAGE_SIZE >= total}
                    className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {selected && (
        <ActionModal
          customer={selected}
          onClose={() => setSelected(null)}
          onRefresh={load}
        />
      )}
    </div>
  )
}
