import { ArrowRight, X, Check, Image, Video, BarChart3, Zap } from 'lucide-react'

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
    <section id="transformation" className="py-28 px-5 relative overflow-hidden">

      {/* Background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute left-1/4 top-1/2 -translate-y-1/2 w-[600px] h-[600px]
          bg-[radial-gradient(circle,rgba(139,92,246,0.06)_0%,transparent_70%)]" />
        <div className="absolute right-0 bottom-0 w-[400px] h-[400px]
          bg-[radial-gradient(circle,rgba(99,102,241,0.05)_0%,transparent_70%)]" />
      </div>

      <div className="relative max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-[11px] font-bold tracking-[0.14em] uppercase text-indigo-400 mb-4">
            Antes e depois
          </span>
          <h2 className="text-[32px] sm:text-[42px] font-bold text-slate-100 leading-tight mb-5">
            Como é sua gestão hoje —
            <span className="block gradient-text mt-1">e como pode ser com Nezora</span>
          </h2>
        </div>

        {/* Comparison grid */}
        <div className="grid md:grid-cols-[1fr_56px_1fr] gap-4 items-start mb-16">

          {/* Before */}
          <div className="bg-[#0D0D14] border border-[#1A1A24] rounded-2xl p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-7 h-7 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center">
                <X className="w-3.5 h-3.5 text-red-400" />
              </div>
              <span className="text-[14px] font-semibold text-red-400/80">Sem Nezora</span>
            </div>
            <ul className="space-y-3">
              {before.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[13px] text-slate-600">
                  <X className="w-3.5 h-3.5 text-red-500/40 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Arrow */}
          <div className="hidden md:flex items-center justify-center mt-16">
            <div className="w-9 h-9 bg-indigo-600/15 border border-indigo-500/25 rounded-full flex items-center justify-center">
              <ArrowRight className="w-4 h-4 text-indigo-400" />
            </div>
          </div>

          {/* After */}
          <div className="relative bg-indigo-600/7 border border-indigo-500/20 rounded-2xl p-6 overflow-hidden">
            <div className="absolute -top-16 -right-16 w-48 h-48
              bg-[radial-gradient(circle,rgba(99,102,241,0.18)_0%,transparent_70%)] pointer-events-none" />
            <div className="flex items-center gap-2.5 mb-5">
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
        <div className="md:hidden flex justify-center -mt-8 mb-4">
          <div className="w-8 h-8 bg-indigo-600/15 border border-indigo-500/20 rounded-full flex items-center justify-center rotate-90">
            <ArrowRight className="w-4 h-4 text-indigo-400" />
          </div>
        </div>

        {/* Visual section: AI modules preview */}
        <div className="mt-12">
          <p className="text-center text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600 mb-8">
            Módulos IA disponíveis na plataforma
          </p>
          <div className="grid sm:grid-cols-3 gap-4">

            {/* Geração de conteúdo */}
            <div className="group bg-[#0D0D14] border border-[#1A1A24] hover:border-indigo-500/25
              rounded-2xl p-5 transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="w-9 h-9 bg-indigo-600/15 border border-indigo-500/20 rounded-xl flex items-center justify-center">
                  <Zap className="w-4 h-4 text-indigo-400" />
                </div>
                <span className="text-[8px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/15 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  IA
                </span>
              </div>
              <h4 className="text-[14px] font-semibold text-slate-200 mb-1.5">Gerar com IA</h4>
              <p className="text-[12px] text-slate-500 leading-relaxed">
                Descreva sua marca e deixe a IA criar ideias, legendas e hashtags com sua voz.
              </p>
              <div className="mt-4 space-y-1.5">
                {['Ideia gerada em 3s', 'Tom de voz personalizado'].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-[11px] text-slate-600">
                    <div className="w-1 h-1 rounded-full bg-indigo-500" />
                    {f}
                  </div>
                ))}
              </div>
            </div>

            {/* Árvore de Imagens */}
            <div className="group bg-[#0D0D14] border border-[#1A1A24] hover:border-violet-500/25
              rounded-2xl p-5 transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="w-9 h-9 bg-violet-600/15 border border-violet-500/20 rounded-xl flex items-center justify-center">
                  <Image className="w-4 h-4 text-violet-400" />
                </div>
                <span className="text-[8px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/15 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  IA
                </span>
              </div>
              <h4 className="text-[14px] font-semibold text-slate-200 mb-1.5">Árvore de Imagens</h4>
              <p className="text-[12px] text-slate-500 leading-relaxed">
                Gere famílias visuais completas com variações de estilo, paleta e composição.
              </p>
              <div className="mt-4 space-y-1.5">
                {['Até 3 famílias por geração', 'Refine com um clique'].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-[11px] text-slate-600">
                    <div className="w-1 h-1 rounded-full bg-violet-500" />
                    {f}
                  </div>
                ))}
              </div>
            </div>

            {/* Legendar Vídeo */}
            <div className="group bg-[#0D0D14] border border-[#1A1A24] hover:border-sky-500/25
              rounded-2xl p-5 transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="w-9 h-9 bg-sky-600/15 border border-sky-500/20 rounded-xl flex items-center justify-center">
                  <Video className="w-4 h-4 text-sky-400" />
                </div>
                <span className="text-[8px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/15 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  IA
                </span>
              </div>
              <h4 className="text-[14px] font-semibold text-slate-200 mb-1.5">Legendar Vídeo</h4>
              <p className="text-[12px] text-slate-500 leading-relaxed">
                Transcreva e gere legendas automáticas para seus vídeos de forma precisa e rápida.
              </p>
              <div className="mt-4 space-y-1.5">
                {['Português e inglês', 'Exporta em SRT e texto'].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-[11px] text-slate-600">
                    <div className="w-1 h-1 rounded-full bg-sky-500" />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quote */}
        <p className="text-center text-[13px] text-slate-600 mt-12 max-w-lg mx-auto">
          A transformação não é mágica — é método.{' '}
          <span className="text-slate-500">Nezora entrega o sistema que você precisava ter.</span>
        </p>
      </div>
    </section>
  )
}
