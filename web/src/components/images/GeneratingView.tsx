'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react'

const STEPS = [
  'Analisando direção criativa',
  'Construindo paletas de cor por família',
  'Gerando variações visuais',
  'Organizando ramificações da árvore',
]

export function GeneratingView() {
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setActiveStep((s) => (s < STEPS.length - 1 ? s + 1 : s))
    }, 2400)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="max-w-md mx-auto px-6 py-20 flex flex-col items-center text-center gap-10">

      {/* Icon with glow */}
      <div className="relative">
        <div className="absolute -inset-6 rounded-full bg-indigo-500/6 blur-2xl pointer-events-none" />
        <div
          className="absolute -inset-3 rounded-[28px] border border-indigo-500/10 animate-ping pointer-events-none"
          style={{ animationDuration: '2.8s' }}
        />
        <div className="relative w-20 h-20 rounded-[24px] bg-gradient-to-br from-indigo-600/20 via-violet-600/10 to-transparent border border-indigo-500/25 flex items-center justify-center shadow-xl shadow-indigo-500/10">
          <Sparkles className="w-8 h-8 text-indigo-400" />
        </div>
      </div>

      {/* Heading */}
      <div className="space-y-2">
        <h2 className="text-[22px] font-semibold text-slate-900 tracking-tight">
          Gerando famílias visuais
        </h2>
        <p className="text-[14px] text-slate-500 leading-relaxed max-w-xs mx-auto">
          A IA está criando direções visuais únicas — cada família é uma ramificação criativa distinta.
        </p>
      </div>

      {/* Animated step list */}
      <div className="w-full space-y-1.5 text-left">
        {STEPS.map((step, i) => {
          const isDone   = i < activeStep
          const isActive = i === activeStep
          return (
            <div
              key={step}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-500"
              style={{
                background: isActive ? 'rgba(99,102,241,0.07)' : 'transparent',
                border: isActive ? '1px solid rgba(99,102,241,0.18)' : '1px solid transparent',
              }}
            >
              <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                {isDone && <CheckCircle2 className="w-[18px] h-[18px] text-emerald-500 transition-all" />}
                {isActive && <Loader2 className="w-[18px] h-[18px] text-indigo-400 animate-spin" />}
                {!isDone && !isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                )}
              </div>
              <span className={`text-[13px] transition-colors duration-400 ${
                isActive ? 'text-slate-700 font-medium'
                : isDone  ? 'text-slate-500'
                           : 'text-slate-700'
              }`}>
                {step}
              </span>
            </div>
          )
        })}
      </div>

      <p className="text-[11px] text-slate-700 leading-relaxed">
        Esta página atualiza automaticamente quando as famílias estiverem prontas.
      </p>
    </div>
  )
}
