'use client'

import Link from 'next/link'
import { Clock } from 'lucide-react'
import { usePlan } from '@/hooks/usePlan'

export function TrialBanner() {
  const { data: summary } = usePlan()

  if (!summary?.is_trial_active) return null

  const days = summary.trial_days_left ?? 0
  const label =
    days === 0 ? 'menos de 1 dia'
    : days === 1 ? '1 dia'
    : `${days} dias`

  return (
    <div className="flex items-center justify-center gap-2.5 px-4 py-2 bg-indigo-600 text-white text-[12px] font-medium flex-shrink-0">
      <Clock className="w-3.5 h-3.5 flex-shrink-0" />
      <span>
        Período gratuito ativo — termina em <strong>{label}</strong>.
        Aproveite todos os recursos do plano Professional.
      </span>
      <Link
        href="/billing"
        className="ml-1 underline underline-offset-2 hover:opacity-80 transition-opacity whitespace-nowrap"
      >
        Ver planos
      </Link>
    </div>
  )
}
