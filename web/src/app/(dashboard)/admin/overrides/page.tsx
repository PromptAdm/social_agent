'use client'

import { useEffect, useState, useCallback } from 'react'
import { adminService } from '@/services/adminService'
import { Trash2, Plus, RefreshCw, CheckCircle, XCircle } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Override {
  id:         number
  user_id:    number
  email?:     string
  feature:    string
  enabled:    boolean
  reason:     string | null
  expires_at: string | null
  is_active:  boolean
  created_at: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const KNOWN_FEATURES = ['analytics', 'approval', 'ai_images', 'scheduling', 'bulk_publish', 'team_seats']

// ── Grant Override Modal ──────────────────────────────────────────────────────

interface GrantModalProps {
  onClose:  () => void
  onSaved:  () => void
}

function GrantModal({ onClose, onSaved }: GrantModalProps) {
  const [userId,    setUserId]    = useState('')
  const [feature,   setFeature]   = useState(KNOWN_FEATURES[0])
  const [customFeat, setCustomFeat] = useState('')
  const [enabled,   setEnabled]   = useState(true)
  const [reason,    setReason]    = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const effectiveFeature = feature === '__custom__' ? customFeat.trim() : feature

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId || !effectiveFeature) return
    setLoading(true)
    setError(null)
    try {
      await adminService.setOverride(Number(userId), {
        feature:    effectiveFeature,
        enabled,
        reason:     reason || undefined,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      })
      onSaved()
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to save override')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-[14px] font-semibold text-slate-900">Grant / Revoke Feature Override</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1 block">User ID</label>
            <input
              type="number"
              value={userId}
              onChange={e => setUserId(e.target.value)}
              placeholder="e.g. 42"
              required
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">Find the user ID in the Customers table</p>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Feature</label>
            <select
              value={feature}
              onChange={e => setFeature(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {KNOWN_FEATURES.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
              <option value="__custom__">Custom…</option>
            </select>
            {feature === '__custom__' && (
              <input
                type="text"
                value={customFeat}
                onChange={e => setCustomFeat(e.target.value)}
                placeholder="feature_slug"
                className="mt-2 w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            )}
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Access</label>
            <div className="flex gap-3">
              {[
                { val: true,  label: 'Grant (enable)',  cls: enabled  ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600' },
                { val: false, label: 'Revoke (disable)', cls: !enabled ? 'bg-red-500 text-white'     : 'bg-slate-100 text-slate-600' },
              ].map(({ val, label, cls }) => (
                <button
                  key={String(val)}
                  type="button"
                  onClick={() => setEnabled(val)}
                  className={`flex-1 py-2 rounded-lg text-[12px] font-semibold transition-colors ${cls}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Reason (optional)</label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. VIP customer, beta tester…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Expires At (optional)</label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {error && <p className="text-[12px] text-red-600">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-slate-200 text-[13px] font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !userId || !effectiveFeature}
              className="flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[13px] font-semibold disabled:opacity-50 transition-colors"
            >
              {loading ? 'Saving…' : 'Save Override'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminOverridesPage() {
  const [overrides, setOverrides] = useState<Override[]>([])
  const [loading,   setLoading]   = useState(false)
  const [showGrant, setShowGrant] = useState(false)
  const [deleting,  setDeleting]  = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminService.listOverrides()
      setOverrides(data as Override[])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDelete(override: Override) {
    if (!confirm(`Remove ${override.feature} override for user #${override.user_id}?`)) return
    setDeleting(override.id)
    try {
      await adminService.deleteOverride(override.user_id, override.feature)
      setOverrides(prev => prev.filter(o => o.id !== override.id))
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Feature Overrides</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Per-user grants and restrictions — bypass plan-based access</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowGrant(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-[13px] font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Override
          </button>
        </div>
      </div>

      {/* Active overrides summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Overrides', value: overrides.length },
          { label: 'Active',  value: overrides.filter(o => o.is_active && o.enabled).length,  cls: 'text-emerald-700' },
          { label: 'Revoked', value: overrides.filter(o => o.is_active && !o.enabled).length, cls: 'text-red-600' },
        ].map(({ label, value, cls }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-100 p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-2xl font-bold ${cls ?? 'text-slate-900'}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Loading…</div>
        ) : overrides.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-slate-400 text-sm">No feature overrides configured</p>
            <button
              onClick={() => setShowGrant(true)}
              className="mt-3 text-[13px] text-violet-600 hover:text-violet-700 font-medium"
            >
              Create the first one →
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['User', 'Feature', 'Access', 'Status', 'Reason', 'Expires', 'Actions'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-500 text-[10px] uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {overrides.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5">
                      <span className="font-mono text-slate-600">#{o.user_id}</span>
                      {o.email && <span className="ml-1.5 text-slate-400 text-[10px]">{o.email}</span>}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-slate-800">{o.feature}</td>
                    <td className="px-3 py-2.5">
                      {o.enabled ? (
                        <span className="flex items-center gap-1 text-emerald-700">
                          <CheckCircle className="w-3.5 h-3.5" /> Granted
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600">
                          <XCircle className="w-3.5 h-3.5" /> Revoked
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {o.is_active
                        ? <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">Active</span>
                        : <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">Expired</span>}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 max-w-[180px] truncate">{o.reason ?? '—'}</td>
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{fmtDate(o.expires_at)}</td>
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => handleDelete(o)}
                        disabled={deleting === o.id}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-40"
                        title="Delete override"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showGrant && (
        <GrantModal
          onClose={() => setShowGrant(false)}
          onSaved={load}
        />
      )}
    </div>
  )
}
