'use client'

import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils/cn'

const ICON_MAP = {
  success: CheckCircle2,
  error:   AlertCircle,
  info:    Info,
  warning: AlertTriangle,
}

const STYLE_MAP = {
  success: {
    wrap:    'bg-emerald-50 border-emerald-200 shadow-emerald-100',
    bar:     'bg-emerald-500',
    icon:    'text-emerald-400',
    text:    'text-slate-700',
    close:   'hover:text-emerald-400',
  },
  error: {
    wrap:    'bg-red-50 border-red-200 shadow-red-100',
    bar:     'bg-red-500',
    icon:    'text-red-400',
    text:    'text-slate-700',
    close:   'hover:text-red-400',
  },
  info: {
    wrap:    'bg-indigo-50 border-indigo-200 shadow-indigo-100',
    bar:     'bg-indigo-500',
    icon:    'text-indigo-400',
    text:    'text-slate-700',
    close:   'hover:text-indigo-400',
  },
  warning: {
    wrap:    'bg-amber-50 border-amber-200 shadow-amber-100',
    bar:     'bg-amber-500',
    icon:    'text-amber-400',
    text:    'text-slate-700',
    close:   'hover:text-amber-400',
  },
}

export function Toaster() {
  const { toasts, removeToast } = useUIStore()

  return (
    <div
      aria-live="polite"
      aria-label="Notificações"
      className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 w-[340px] pointer-events-none"
    >
      {toasts.map((t) => {
        const Icon  = ICON_MAP[t.type]
        const style = STYLE_MAP[t.type]
        return (
          <div
            key={t.id}
            className={cn(
              'relative flex items-start gap-3 px-4 py-3.5 rounded-2xl border shadow-xl overflow-hidden',
              'animate-slide-in-right pointer-events-auto backdrop-blur-sm',
              style.wrap,
            )}
          >
            {/* Left accent bar */}
            <span className={cn('absolute left-0 inset-y-2.5 w-[3px] rounded-r-full', style.bar)} />

            <Icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0 ml-1', style.icon)} />
            <p className={cn('text-[13px] flex-1 leading-snug', style.text)}>
              {t.message}
            </p>
            <button
              onClick={() => removeToast(t.id)}
              className={cn(
                'flex-shrink-0 text-slate-700 transition-colors mt-0.5',
                style.close,
              )}
              aria-label="Fechar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
