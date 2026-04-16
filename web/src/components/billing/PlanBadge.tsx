'use client'

import { cn } from '@/lib/utils/cn'
import type { PlanCode } from '@/types'

interface PlanBadgeProps {
  plan: PlanCode
  className?: string
}

const PLAN_STYLES: Record<PlanCode, string> = {
  free:         'bg-slate-700/40 text-slate-400 border-slate-700/50',
  basic:        'bg-blue-600/15 text-blue-400 border-blue-500/25',
  professional: 'bg-indigo-600/15 text-indigo-400 border-indigo-500/25',
  premium:      'bg-violet-600/15 text-violet-400 border-violet-500/25',
  legacy:       'bg-slate-700/40 text-slate-500 border-slate-700/50',
}

const PLAN_LABELS: Record<PlanCode, string> = {
  free:         'Free',
  basic:        'Basic',
  professional: 'Pro',
  premium:      'Premium',
  legacy:       'Legacy',
}

export function PlanBadge({ plan, className }: PlanBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold',
        'tracking-wide uppercase leading-none border',
        PLAN_STYLES[plan],
        className,
      )}
    >
      {PLAN_LABELS[plan]}
    </span>
  )
}
