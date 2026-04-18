import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'

interface KpiCardProps {
  label:       string
  value:       string | number
  delta?:      number
  deltaLabel?: string
  href?:       string
  hrefLabel?:  string
  accent?:     'default' | 'indigo' | 'emerald' | 'amber' | 'red'
  className?:  string
}

const ACCENT_BAR: Record<string, string> = {
  default: 'bg-slate-300',
  indigo:  'bg-indigo-400',
  emerald: 'bg-emerald-400',
  amber:   'bg-amber-400',
  red:     'bg-red-400',
}

export function KpiCard({
  label,
  value,
  delta,
  deltaLabel,
  href,
  hrefLabel,
  accent = 'default',
  className,
}: KpiCardProps) {
  const isPositive = delta !== undefined && delta >= 0
  const hasChange  = delta !== undefined

  return (
    <div
      className={cn(
        'relative bg-white border border-slate-200/80 rounded-2xl p-5',
        'flex flex-col gap-3 overflow-hidden',
        'shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.04)]',
        'hover:shadow-[0_4px_16px_rgba(0,0,0,0.07)] hover:-translate-y-px transition-all duration-200',
        className,
      )}
    >
      {/* Subtle top accent bar */}
      <span className={cn('absolute top-0 left-4 right-4 h-[2px] rounded-b opacity-70', ACCENT_BAR[accent])} />

      {/* Label */}
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 mt-1">
        {label}
      </p>

      {/* Value */}
      <p className="text-[28px] font-bold text-slate-900 leading-none tracking-tight tabular-nums">
        {value}
      </p>

      {/* Footer row */}
      <div className="flex items-center justify-between min-h-[16px]">
        {hasChange ? (
          <div
            className={cn(
              'flex items-center gap-1 text-[11px] font-medium',
              isPositive ? 'text-emerald-600' : 'text-red-500',
            )}
          >
            {isPositive ? (
              <TrendingUp className="w-3 h-3 flex-shrink-0" />
            ) : (
              <TrendingDown className="w-3 h-3 flex-shrink-0" />
            )}
            <span>
              {isPositive ? '+' : ''}{delta}
              {deltaLabel && (
                <span className="text-slate-400 font-normal ml-1">{deltaLabel}</span>
              )}
            </span>
          </div>
        ) : (
          <span />
        )}

        {href && (
          <Link
            href={href}
            className="flex items-center gap-0.5 text-[11px] text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            {hrefLabel ?? 'Ver'}
            <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  )
}
