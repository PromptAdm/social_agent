import { Loader2, Sparkles } from 'lucide-react'

const STEPS = [
  'Analisando direção criativa',
  'Construindo paletas de cor por família',
  'Gerando variações visuais',
  'Organizando ramificações da árvore',
]

export function GeneratingView() {
  return (
    <div className="max-w-lg mx-auto px-6 py-16 flex flex-col items-center text-center gap-8">

      {/* Animated icon */}
      <div className="relative">
        <div className="w-20 h-20 bg-indigo-600/10 border border-indigo-500/20 rounded-3xl flex items-center justify-center">
          <Sparkles className="w-9 h-9 text-indigo-400" />
        </div>
        <div className="absolute -inset-2 rounded-3xl border border-indigo-500/15 animate-ping" />
      </div>

      {/* Labels */}
      <div>
        <h2 className="text-[22px] font-semibold text-slate-100 mb-2">
          Gerando famílias visuais...
        </h2>
        <p className="text-[14px] text-slate-500 leading-relaxed">
          A IA está criando direções visuais únicas para seu projeto.
          Cada família representa uma ramificação criativa distinta.
        </p>
      </div>

      {/* Steps */}
      <div className="w-full space-y-2.5">
        {STEPS.map((step, i) => (
          <div key={step} className="flex items-center gap-3">
            <div className="relative w-5 h-5 flex-shrink-0 flex items-center justify-center">
              {i === 0 ? (
                <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
              ) : (
                <div className="w-2 h-2 bg-[#27273A] rounded-full" />
              )}
            </div>
            <span className={`text-[13px] ${i === 0 ? 'text-slate-300 font-medium' : 'text-slate-600'}`}>
              {step}
            </span>
          </div>
        ))}
      </div>

      <p className="text-[12px] text-slate-700">
        Esta página se atualizará automaticamente quando as famílias estiverem prontas.
      </p>
    </div>
  )
}
