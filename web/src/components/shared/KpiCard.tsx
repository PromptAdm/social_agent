import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'

interface KpiCardProps {
  label: string
  value: string | number
  delta?: number
  deltaLabel?: string
  href?: string
  hrefLabel?: string
  className?: string
}

export function KpiCard({
  label,
  value,
  delta,
  deltaLabel,
  href,
  hrefLabel,
  className,
}: KpiCardProps) {
  const isPositive = delta !== undefined && delta >= 0
  const hasChange = delta !== undefined

  return (
    <div
      className={cn(
        'bg-[#111118] border border-[#27273A] rounded-lg p-5 flex flex-col gap-3',
        className
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
        {label}
      </p>

      <p className="text-3xl font-bold text-slate-100 tracking-tight">{value}</p>

      <div className="flex items-center justify-between min-h-[20px]">
        {hasChange && (
          <div
            className={cn(
              'flex items-center gap-1 text-[12px] font-medium',
              isPositive ? 'text-emerald-400' : 'text-red-400'
            )}
          >
            {isPositive ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            <span>
              {isPositive ? '+' : ''}
              {delta}
              {deltaLabel && (
                <span className="text-slate-500 font-normal ml-1">{deltaLabel}</span>
              )}
            </span>
          </div>
        )}

        {href && (
          <Link
            href={href}
            className="flex items-center gap-1 text-[12px] text-indigo-400 hover:text-indigo-300 transition-colors ml-auto"
          >
            {hrefLabel ?? 'Ver'}
            <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  )
}
