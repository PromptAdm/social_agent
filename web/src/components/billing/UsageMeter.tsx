'use client'

import { cn } from '@/lib/utils/cn'

interface UsageMeterProps {
  label: string
  used: number
  limit: number        // -1 = ilimitado
  className?: string
}

function barColor(pct: number): string {
  if (pct >= 100) return 'bg-red-500'
  if (pct >= 80)  return 'bg-amber-500'
  return 'bg-indigo-500'
}

export function UsageMeter({ label, used, limit, className }: UsageMeterProps) {
  const unlimited = limit === -1
  const pct       = unlimited ? 0 : Math.min(100, Math.round((used / limit) * 100))

  return (
    <div className={cn('space-y-1', className)}>
      {/* Label row */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-500 leading-none">{label}</span>
        <span className="text-[10px] text-slate-500 leading-none tabular-nums">
          {unlimited ? (
            <span className="text-slate-600">∞</span>
          ) : (
            <>{used}<span className="text-slate-700">/{limit}</span></>
          )}
        </span>
      </div>

      {/* Bar */}
      {!unlimited && (
        <div className="h-[3px] w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', barColor(pct))}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}
