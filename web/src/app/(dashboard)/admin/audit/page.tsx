'use client'

import { useEffect, useState, useCallback } from 'react'
import { adminService, type AuditLog } from '@/services/adminService'
import { ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(s: string) {
  return new Date(s).toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const ACTION_COLORS: Record<string, string> = {
  suspend:           'bg-red-100 text-red-700',
  reactivate:        'bg-emerald-100 text-emerald-700',
  change_plan:       'bg-violet-100 text-violet-700',
  adjust_credits:    'bg-amber-100 text-amber-700',
  reset_trial:       'bg-blue-100 text-blue-700',
  impersonate:       'bg-orange-100 text-orange-700',
  set_override:      'bg-indigo-100 text-indigo-700',
  delete_override:   'bg-pink-100 text-pink-700',
}

function ActionBadge({ action }: { action: string }) {
  const cls = ACTION_COLORS[action] ?? 'bg-slate-100 text-slate-600'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>
      {action.replace(/_/g, ' ')}
    </span>
  )
}

const KNOWN_ACTIONS = [
  'suspend', 'reactivate', 'change_plan', 'adjust_credits',
  'reset_trial', 'impersonate', 'set_override', 'delete_override',
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminAuditPage() {
  const [logs,     setLogs]     = useState<AuditLog[]>([])
  const [total,    setTotal]    = useState(0)
  const [page,     setPage]     = useState(0)
  const [loading,  setLoading]  = useState(false)
  const [expanded, setExpanded] = useState<number | null>(null)

  // Filters
  const [actorId,  setActorId]  = useState('')
  const [targetId, setTargetId] = useState('')
  const [action,   setAction]   = useState('')

  const limit = 100

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminService.listAuditLogs({
        actor_id:  actorId  ? Number(actorId)  : undefined,
        target_id: targetId ? Number(targetId) : undefined,
        action:    action   || undefined,
        limit,
        offset:    page * limit,
      })
      setLogs(res.logs)
      setTotal(res.total)
    } finally {
      setLoading(false)
    }
  }, [actorId, targetId, action, page])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(0) }, [actorId, targetId, action])

  const pages = Math.ceil(total / limit)

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Audit Log</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">Every admin action — immutable record</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            type="number"
            value={actorId}
            onChange={e => setActorId(e.target.value)}
            placeholder="Actor ID"
            className="pl-8 pr-3 py-1.5 text-[12px] border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 w-32"
          />
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            type="number"
            value={targetId}
            onChange={e => setTargetId(e.target.value)}
            placeholder="Target ID"
            className="pl-8 pr-3 py-1.5 text-[12px] border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 w-32"
          />
        </div>

        <select
          value={action}
          onChange={e => setAction(e.target.value)}
          className="text-[12px] border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option value="">All actions</option>
          {KNOWN_ACTIONS.map(a => (
            <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
          ))}
        </select>

        <button
          onClick={load}
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
        </button>

        <span className="text-[11px] text-slate-400 ml-auto">{total.toLocaleString('pt-BR')} events</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Loading…</div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No audit logs found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Timestamp', 'Action', 'Actor', 'Target', 'Change', 'Notes'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-500 text-[10px] uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.map((log) => (
                  <>
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                    >
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{fmtDate(log.created_at)}</td>
                      <td className="px-3 py-2.5"><ActionBadge action={log.action_type} /></td>
                      <td className="px-3 py-2.5">
                        {log.actor_user_id
                          ? <span className="font-mono text-slate-600">#{log.actor_user_id}</span>
                          : <span className="text-slate-300">system</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        {log.target_user_id
                          ? <span className="font-mono text-slate-600">#{log.target_user_id}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5 max-w-[200px]">
                        {(log.old_value || log.new_value) && (
                          <div className="flex items-center gap-1.5 text-[11px]">
                            {log.old_value && (
                              <span className="text-slate-400 truncate max-w-[80px]">{log.old_value}</span>
                            )}
                            {log.old_value && log.new_value && (
                              <span className="text-slate-300">→</span>
                            )}
                            {log.new_value && (
                              <span className="text-slate-700 font-medium truncate max-w-[80px]">{log.new_value}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 max-w-[200px] truncate">{log.notes ?? '—'}</td>
                    </tr>

                    {expanded === log.id && (
                      <tr key={`${log.id}-detail`} className="bg-amber-50">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="grid grid-cols-2 gap-4 text-[11px]">
                            <div>
                              <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wide">Old Value</span>
                              <pre className="mt-1 text-slate-700 whitespace-pre-wrap break-all">{log.old_value || '—'}</pre>
                            </div>
                            <div>
                              <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wide">New Value</span>
                              <pre className="mt-1 text-slate-700 whitespace-pre-wrap break-all">{log.new_value || '—'}</pre>
                            </div>
                            {log.notes && (
                              <div className="col-span-2">
                                <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wide">Notes</span>
                                <p className="mt-1 text-slate-700">{log.notes}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}

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
