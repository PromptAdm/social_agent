'use client'

import { useState } from 'react'
import { X, CalendarClock, Clock, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useSchedulePost } from '@/hooks/usePosts'
import type { Post } from '@/types'

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Returns datetime-local min value (now + 5 min, rounded to the minute). */
function getMinDateTime(): string {
  const d = new Date(Date.now() + 5 * 60 * 1000)
  d.setSeconds(0, 0)
  // Format: YYYY-MM-DDTHH:mm
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Returns a set of quick-schedule options. */
function getQuickOptions() {
  const now = new Date()
  const options = [
    { label: 'Em 1 hora',   ms: 1  * 60 * 60 * 1000 },
    { label: 'Em 3 horas',  ms: 3  * 60 * 60 * 1000 },
    { label: 'Amanhã 9h',   ms: null,
      date: (() => {
        const d = new Date(now); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d
      })()
    },
    { label: 'Amanhã 18h',  ms: null,
      date: (() => {
        const d = new Date(now); d.setDate(d.getDate() + 1); d.setHours(18, 0, 0, 0); return d
      })()
    },
    { label: 'Próxima segunda 9h', ms: null,
      date: (() => {
        const d = new Date(now)
        const diff = (1 + 7 - d.getDay()) % 7 || 7
        d.setDate(d.getDate() + diff); d.setHours(9, 0, 0, 0); return d
      })()
    },
  ]

  return options.map((opt) => {
    const date = opt.date ?? new Date(now.getTime() + (opt.ms ?? 0))
    const pad = (n: number) => String(n).padStart(2, '0')
    const value = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
    return { label: opt.label, value }
  })
}

function formatDatetimePreview(value: string): string {
  if (!value) return '—'
  try {
    const d = new Date(value)
    return d.toLocaleString('pt-BR', {
      day:    '2-digit',
      month:  'long',
      year:   'numeric',
      hour:   '2-digit',
      minute: '2-digit',
      weekday:'long',
    })
  } catch {
    return value
  }
}

// ── ScheduleModal ──────────────────────────────────────────────────────────────

interface ScheduleModalProps {
  post: Post
  onClose: () => void
}

export function ScheduleModal({ post, onClose }: ScheduleModalProps) {
  const minDateTime   = getMinDateTime()
  const quickOptions  = getQuickOptions()
  const [dateValue, setDateValue] = useState('')
  const [error,     setError]     = useState('')

  const schedulePost = useSchedulePost()

  function handleQuickOption(value: string) {
    setDateValue(value)
    setError('')
  }

  function handleManualChange(value: string) {
    setDateValue(value)
    setError('')
  }

  function validate(): boolean {
    if (!dateValue) {
      setError('Selecione uma data e horário.')
      return false
    }
    const chosen = new Date(dateValue)
    const now    = new Date()
    if (chosen <= now) {
      setError('A data deve ser no futuro.')
      return false
    }
    return true
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const isoString = new Date(dateValue).toISOString()
    schedulePost.mutate(
      { id: post.id, payload: { scheduled_at: isoString } },
      { onSuccess: onClose },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        className="bg-slate-50 border border-slate-300 rounded-xl w-full max-w-[480px] shadow-modal animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/15 border border-blue-500/20 flex items-center justify-center">
              <CalendarClock className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Agendar publicação</h2>
              <p className="text-[11px] text-slate-500 truncate max-w-[260px]">{post.caption}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-600 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-5">

            {/* Quick options */}
            <div>
              <label className="field-label block mb-2">Horários sugeridos</label>
              <div className="grid grid-cols-2 gap-1.5">
                {quickOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleQuickOption(opt.value)}
                    className={cn(
                      'px-3 py-2 rounded-lg text-[12px] font-medium border text-left transition-all',
                      dateValue === opt.value
                        ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                        : 'bg-white border-slate-300 text-slate-400 hover:text-slate-700 hover:border-slate-300',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[10px] text-slate-700 uppercase tracking-wide">ou escolha</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Manual datetime */}
            <div>
              <label className="field-label block mb-1.5">
                <Clock className="w-3 h-3 inline mr-1" />
                Data e horário exatos
              </label>
              <input
                type="datetime-local"
                value={dateValue}
                min={minDateTime}
                onChange={(e) => handleManualChange(e.target.value)}
                className="input"
              />
            </div>

            {/* Preview */}
            {dateValue && !error && (
              <div className="bg-blue-950/20 border border-blue-900/30 rounded-lg px-3.5 py-2.5">
                <p className="text-[11px] text-blue-400 leading-relaxed">
                  Publicação agendada para{' '}
                  <span className="font-semibold">
                    {formatDatetimePreview(dateValue)}
                  </span>
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 bg-red-950/30 border border-red-900/30 rounded-lg px-3.5 py-2.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                <p className="text-[12px] text-red-400">{error}</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200">
            <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
            <button
              type="submit"
              disabled={schedulePost.isPending || !dateValue}
              className="btn-primary min-w-[120px]"
            >
              {schedulePost.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Agendando…
                </span>
              ) : 'Confirmar agendamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
