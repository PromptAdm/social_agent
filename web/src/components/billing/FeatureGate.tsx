'use client'

import Link from 'next/link'
import { Lock, ArrowRight } from 'lucide-react'
import { useHasFeature } from '@/hooks/usePlan'
import type { PlanFeatures } from '@/types'

interface FeatureGateProps {
  feature: keyof PlanFeatures
  /** Display name for the feature — shown in the upgrade CTA */
  label: string
  /** Minimum plan name required */
  requiredPlan?: string
  children: React.ReactNode
}

export function FeatureGate({
  feature,
  label,
  requiredPlan = 'Professional',
  children,
}: FeatureGateProps) {
  const hasFeature = useHasFeature(feature)

  if (hasFeature) return <>{children}</>

  return (
    <div className="flex flex-col items-center justify-center flex-1 min-h-[60vh] px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
        <Lock className="w-6 h-6 text-slate-400" />
      </div>

      <h2 className="text-[18px] font-bold text-slate-900 mb-2">
        {label} não disponível no seu plano
      </h2>
      <p className="text-[14px] text-slate-500 max-w-sm mb-7 leading-relaxed">
        Faça upgrade para o plano <strong>{requiredPlan}</strong> ou superior para
        desbloquear {label.toLowerCase()}.
      </p>

      <div className="flex items-center gap-3 flex-wrap justify-center">
        <Link
          href="/billing"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-[13px] font-semibold hover:bg-indigo-700 transition-colors"
        >
          Ver planos
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        <Link
          href="/billing"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-slate-200 text-[13px] text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Fazer upgrade
        </Link>
      </div>
    </div>
  )
}
