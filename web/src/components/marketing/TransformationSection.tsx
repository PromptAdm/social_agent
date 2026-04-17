import { ArrowRight, X, Check } from 'lucide-react'

const before = [
  'Fica sem saber o que postar',
  'Posta de forma irregular, perde tração',
  'Mistura aprovações no WhatsApp',
  'Não sabe quais posts funcionaram',
  'Perde tempo com ferramentas desconexas',
  'Sensação constante de estar atrasado',
]

const after = [
  'Ideias sempre disponíveis com IA',
  'Calendário cheio com semanas de antecedência',
  'Aprovações organizadas com histórico',
  'Analytics claros por post e período',
  'Tudo em um painel único e limpo',
  'Conteúdo consistente no piloto automático',
]

export function TransformationSection() {
  return (
    <section id="transformation" className="py-28 px-5">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-[11px] font-bold tracking-[0.12em] uppercase text-indigo-400 mb-4">
            Antes e depois
          </span>
          <h2 className="text-[32px] sm:text-[40px] font-bold text-slate-100 leading-tight">
            Como é sua gestão de redes sociais{' '}
            <span className="block sm:inline">hoje e como pode ser</span>
          </h2>
        </div>

        {/* Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 items-start">

          {/* Before */}
          <div className="bg-[#0F0F17] border border-[#1E1E2A] rounded-2xl p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-7 h-7 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center">
                <X className="w-3.5 h-3.5 text-red-400" />
              </div>
              <span className="text-[14px] font-semibold text-red-400">Sem Nezora</span>
            </div>
            <ul className="space-y-3">
              {before.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[13px] text-slate-500">
                  <X className="w-3.5 h-3.5 text-red-500/50 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Arrow */}
          <div className="hidden md:flex items-center justify-center pt-16">
            <div className="w-10 h-10 bg-indigo-600/15 border border-indigo-500/20 rounded-full flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-indigo-400" />
            </div>
          </div>

          {/* After */}
          <div className="bg-indigo-600/8 border border-indigo-500/20 rounded-2xl p-6 relative overflow-hidden">
            {/* Glow */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

            <div className="flex items-center gap-2.5 mb-5 relative">
              <div className="w-7 h-7 bg-indigo-500/15 border border-indigo-500/30 rounded-full flex items-center justify-center">
                <Check className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <span className="text-[14px] font-semibold text-indigo-400">Com Nezora</span>
            </div>
            <ul className="space-y-3 relative">
              {after.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[13px] text-slate-300">
                  <Check className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Mobile arrow */}
        <div className="md:hidden flex justify-center my-4">
          <div className="w-8 h-8 bg-indigo-600/15 border border-indigo-500/20 rounded-full flex items-center justify-center rotate-90">
            <ArrowRight className="w-4 h-4 text-indigo-400" />
          </div>
        </div>

        {/* Bottom note */}
        <p className="text-center text-[13px] text-slate-600 mt-10">
          A transformação não é mágica — é método. Nezora entrega o sistema que você precisava ter.
        </p>
      </div>
    </section>
  )
}
