'use client'

import { cn } from '@/lib/utils/cn'
import type { PlanCode } from '@/types'

interface PlanBadgeProps {
  plan: PlanCode
  className?: string
}

const PLAN_STYLES: Record<PlanCode, string> = {
  starter:      'bg-slate-100 text-slate-500 border-slate-200',
  free:         'bg-slate-100 text-slate-500 border-slate-200',
  basic:        'bg-slate-100 text-slate-500 border-slate-200',
  professional: 'bg-blue-50 text-blue-600 border-blue-200',
  premium:      'bg-blue-50 text-blue-700 border-blue-200',
  legacy:       'bg-slate-100 text-slate-400 border-slate-200',
}

const PLAN_LABELS: Record<PlanCode, string> = {
  starter:      'Starter',
  free:         'Starter',
  basic:        'Starter',
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
