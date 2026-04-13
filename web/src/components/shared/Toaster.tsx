'use client'

import { useEffect } from 'react'
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
    wrap:  'bg-[#0D1A14] border-emerald-900/40',
    icon:  'text-emerald-400',
    text:  'text-emerald-50',
    close: 'hover:text-emerald-400',
  },
  error: {
    wrap:  'bg-[#1A0D0D] border-red-900/40',
    icon:  'text-red-400',
    text:  'text-red-50',
    close: 'hover:text-red-400',
  },
  info: {
    wrap:  'bg-[#0D0D1A] border-indigo-900/40',
    icon:  'text-indigo-400',
    text:  'text-indigo-50',
    close: 'hover:text-indigo-400',
  },
  warning: {
    wrap:  'bg-[#1A1400] border-amber-900/40',
    icon:  'text-amber-400',
    text:  'text-amber-50',
    close: 'hover:text-amber-400',
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
              'flex items-start gap-3 px-4 py-3 rounded-xl border shadow-modal',
              'animate-slide-in-right pointer-events-auto',
              style.wrap,
            )}
          >
            <Icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', style.icon)} />
            <p className={cn('text-[13px] flex-1 leading-snug', style.text)}>
              {t.message}
            </p>
            <button
              onClick={() => removeToast(t.id)}
              className={cn(
                'flex-shrink-0 text-white/30 transition-colors mt-0.5',
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
