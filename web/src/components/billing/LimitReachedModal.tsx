'use client'

import { X, Zap, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface LimitReachedModalProps {
  onClose: () => void
  /** Credit balance available — shown so user knows they can buy more */
  creditBalance?: number
}

export function LimitReachedModal({ onClose, creditBalance = 0 }: LimitReachedModalProps) {
  const router = useRouter()

  function goTo(href: string) {
    onClose()
    router.push(href)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-sm mx-4 bg-white rounded-2xl shadow-2xl p-6">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-400 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center mb-4">
          <Zap className="w-6 h-6 text-orange-400" />
        </div>

        {/* Copy */}
        <h2 className="text-[17px] font-bold text-slate-900 mb-1">
          Limite do plano atingido
        </h2>
        <p className="text-[13px] text-slate-500 leading-relaxed mb-5">
          Você atingiu o limite mensal de posts do seu plano.
          {creditBalance > 0
            ? ` Você tem ${creditBalance} crédito${creditBalance === 1 ? '' : 's'} disponíve${creditBalance === 1 ? 'l' : 'is'} — cada post extra consome 1 crédito.`
            : ' Compre créditos avulsos ou faça upgrade para continuar publicando.'}
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => goTo('/billing#credits')}
            className="flex items-center justify-center gap-1.5 h-10 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[13px] font-semibold transition-colors"
          >
            Comprar Créditos
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => goTo('/billing')}
            className="flex items-center justify-center gap-1.5 h-10 rounded-lg border border-slate-200 text-[13px] text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Ver planos e fazer upgrade
          </button>
        </div>
      </div>
    </div>
  )
}
