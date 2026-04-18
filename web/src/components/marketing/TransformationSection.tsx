import Image from 'next/image'
import { ArrowRight, X, Check, ImageIcon, Video, Zap } from 'lucide-react'

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
    <section id="transformation" className="py-28 px-6 bg-white relative overflow-hidden">

      {/* Subtle background */}
      <div
        className="absolute right-0 top-1/2 -translate-y-1/2 w-[600px] h-[600px]
          bg-[radial-gradient(circle,rgba(139,92,246,0.05)_0%,transparent_65%)]
          pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-[11px] font-bold tracking-[0.14em] uppercase text-indigo-600 mb-4">
            Antes e depois
          </span>
          <h2 className="text-[30px] sm:text-[40px] font-bold text-slate-900 leading-tight mb-5 tracking-tight">
            Como é sua gestão hoje —{' '}
            <span className="mktg-gradient-text">e como pode ser com Nezora</span>
          </h2>
        </div>

        {/* Comparison grid */}
        <div className="grid md:grid-cols-[1fr_52px_1fr] gap-4 items-start mb-20">

          {/* Before */}
          <div className="bg-[#FFF8F8] border border-red-100 rounded-2xl p-7
            shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="icon-circle icon-red w-7 h-7">
                <X className="w-3.5 h-3.5 text-red-500" strokeWidth={1.5} />
              </div>
              <span className="text-[14px] font-semibold text-red-600">Sem Nezora</span>
            </div>
            <ul className="space-y-3">
              {before.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[13px] text-slate-500">
                  <X className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Arrow divider */}
          <div className="hidden md:flex items-center justify-center mt-16">
            <div className="icon-circle icon-indigo w-9 h-9">
              <ArrowRight className="w-4 h-4 text-indigo-600" strokeWidth={1.5} />
            </div>
          </div>

          {/* After */}
          <div className="relative bg-gradient-to-br from-indigo-50/80 to-violet-50/40
            border border-indigo-200/40 rounded-2xl p-7 overflow-hidden
            shadow-[0_1px_4px_rgba(99,102,241,0.06),0_8px_24px_rgba(99,102,241,0.06)]">
            <div className="absolute -top-12 -right-12 w-40 h-40
              bg-[radial-gradient(circle,rgba(99,102,241,0.12)_0%,transparent_70%)] pointer-events-none" />
            <div className="flex items-center gap-2.5 mb-6">
              <div className="icon-circle icon-indigo w-7 h-7">
                <Check className="w-3.5 h-3.5 text-indigo-600" strokeWidth={1.5} />
              </div>
              <span className="text-[14px] font-semibold text-indigo-700">Com Nezora</span>
            </div>
            <ul className="space-y-3 relative">
              {after.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[13px] text-slate-700">
                  <Check className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Mobile arrow */}
        <div className="md:hidden flex justify-center -mt-10 mb-6">
          <div className="icon-circle icon-indigo w-8 h-8 rotate-90">
            <ArrowRight className="w-4 h-4 text-indigo-600" strokeWidth={1.5} />
          </div>
        </div>

        {/* Social platforms visual */}
        <div className="grid lg:grid-cols-2 gap-10 items-center mb-20">
          {/* Left: text */}
          <div>
            <span className="inline-block text-[11px] font-bold tracking-[0.14em] uppercase text-indigo-600 mb-4">
              Integrado a tudo
            </span>
            <h3 className="text-[26px] sm:text-[32px] font-bold text-slate-900 leading-tight mb-4 tracking-tight">
              Publique em todas as plataformas{' '}
              <span className="mktg-gradient-text">sem trocar de aba</span>
            </h3>
            <p className="text-[15px] text-slate-500 leading-relaxed mb-6">
              Instagram, LinkedIn, TikTok, Facebook, YouTube e mais — gerencie
              todos em um único painel, com um calendário unificado e analytics centralizados.
            </p>
            <a href="/register"
              className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-indigo-600 hover:text-indigo-700 transition-colors group">
              Ver todas as integrações
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={1.5} />
            </a>
          </div>

          {/* Right: phone with integrations */}
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-100/60 to-violet-50/40 rounded-3xl blur-2xl pointer-events-none" />
            <Image
              src="/images/mockup-integrations.png"
              alt="Nezora — integrações com redes sociais"
              width={800}
              height={700}
              className="relative w-full max-w-md h-auto object-contain drop-shadow-xl"
            />
          </div>
        </div>

        {/* AI modules */}
        <div>
          <p className="text-center text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 mb-8">
            Módulos IA disponíveis na plataforma
          </p>
          <div className="grid sm:grid-cols-3 gap-4">

            {[
              {
                icon:   Zap,
                accent: 'indigo',
                badge:  'IA',
                title:  'Gerar com IA',
                desc:   'Descreva sua marca e deixe a IA criar ideias, legendas e hashtags com sua voz.',
                feats:  ['Ideia gerada em 3s', 'Tom de voz personalizado'],
              },
              {
                icon:   ImageIcon,
                accent: 'violet',
                badge:  'IA',
                title:  'Árvore de Imagens',
                desc:   'Gere famílias visuais completas com variações de estilo, paleta e composição.',
                feats:  ['Até 3 famílias por geração', 'Refine com um clique'],
              },
              {
                icon:   Video,
                accent: 'sky',
                badge:  'IA',
                title:  'Legendar Vídeo',
                desc:   'Transcreva e gere legendas automáticas para seus vídeos de forma precisa e rápida.',
                feats:  ['Português e inglês', 'Exporta em SRT e texto'],
              },
            ].map(({ icon: Icon, accent, badge, title, desc, feats }) => {
              const colors: Record<string, { wrap: string; iconTint: string; iconColor: string; badge: string; dot: string }> = {
                indigo: { wrap: 'border-indigo-100 hover:border-indigo-200/70', iconTint: 'icon-indigo', iconColor: 'text-indigo-600', badge: 'text-indigo-700 bg-indigo-50 border-indigo-200/60', dot: 'bg-indigo-500' },
                violet: { wrap: 'border-violet-100 hover:border-violet-200/70', iconTint: 'icon-violet', iconColor: 'text-violet-600', badge: 'text-violet-700 bg-violet-50 border-violet-200/60', dot: 'bg-violet-500' },
                sky:    { wrap: 'border-sky-100    hover:border-sky-200/70',    iconTint: 'icon-sky',    iconColor: 'text-sky-600',    badge: 'text-sky-700    bg-sky-50    border-sky-200/60',    dot: 'bg-sky-500'    },
              }
              const c = colors[accent]
              return (
                <div key={title}
                  className={`group bg-white border ${c.wrap} rounded-2xl p-5
                    shadow-[0_1px_4px_rgba(0,0,0,0.04)]
                    hover:shadow-[0_8px_28px_rgba(0,0,0,0.08)]
                    transition-all duration-300`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`icon-pill w-9 h-9 ${c.iconTint} ${c.iconColor}`}>
                      <Icon className="w-4 h-4" strokeWidth={1.5} />
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-wider border rounded-full px-2 py-0.5 ${c.badge}`}>
                      {badge}
                    </span>
                  </div>
                  <h4 className="text-[14px] font-semibold text-slate-900 mb-1.5">{title}</h4>
                  <p className="text-[12px] text-slate-500 leading-relaxed mb-4">{desc}</p>
                  <div className="space-y-1.5">
                    {feats.map((f) => (
                      <div key={f} className="flex items-center gap-2 text-[11px] text-slate-500">
                        <div className={`w-1 h-1 rounded-full ${c.dot}`} />
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Quote */}
        <p className="text-center text-[14px] text-slate-400 mt-12 max-w-lg mx-auto">
          A transformação não é mágica — é método.{' '}
          <span className="text-slate-600 font-medium">Nezora entrega o sistema que você precisava ter.</span>
        </p>
      </div>
    </section>
  )
}
