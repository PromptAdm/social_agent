import { Zap, CalendarDays, CheckSquare, BarChart3, Building2, Layers } from 'lucide-react'

const benefits = [
  {
    icon:    Zap,
    title:   'Geração de conteúdo com IA',
    body:    'Descreva sua marca e objetivo — o Nezora sugere ideias, títulos e textos prontos para adaptar. Sem a tela em branco.',
    tag:     'IA integrada',
    accent:  'indigo',
  },
  {
    icon:    CalendarDays,
    title:   'Calendário editorial visual',
    body:    'Planeje semanas de conteúdo de uma vez. Veja o que está agendado, pendente e o que ainda precisa de texto.',
    tag:     'Planejamento',
    accent:  'violet',
  },
  {
    icon:    CheckSquare,
    title:   'Fluxo de aprovação',
    body:    'Chefe aprova antes de publicar? O Nezora tem um fluxo de aprovação simples, rastreável e sem WhatsApp.',
    tag:     'Colaboração',
    accent:  'sky',
  },
  {
    icon:    BarChart3,
    title:   'Analytics que fazem sentido',
    body:    'Veja quais posts geraram mais engajamento, qual horário funciona melhor e como sua marca evolui semana a semana.',
    tag:     'Dados reais',
    accent:  'emerald',
  },
  {
    icon:    Building2,
    title:   'Múltiplas marcas',
    body:    'Gerencie perfis separados para cada cliente ou projeto, com histórico e dados completamente independentes.',
    tag:     'Multi-brand',
    accent:  'amber',
  },
  {
    icon:    Layers,
    title:   'Tudo em um só lugar',
    body:    'Sem saltar entre Notion, Google Docs, Canva e planilhas. Ideias, textos, aprovações e publicações dentro do Nezora.',
    tag:     'Produtividade',
    accent:  'pink',
  },
]

const ACCENT: Record<string, { tag: string; iconTint: string; iconColor: string; border: string; top: string }> = {
  indigo:  { tag: 'text-indigo-700  bg-indigo-50  border-indigo-200/60',  iconTint: 'icon-indigo',  iconColor: 'text-indigo-600',  border: 'group-hover:border-indigo-200/60',  top: 'bg-gradient-to-r from-indigo-400  to-indigo-500'  },
  violet:  { tag: 'text-violet-700  bg-violet-50  border-violet-200/60',  iconTint: 'icon-violet',  iconColor: 'text-violet-600',  border: 'group-hover:border-violet-200/60',  top: 'bg-gradient-to-r from-violet-400  to-violet-500'  },
  sky:     { tag: 'text-sky-700     bg-sky-50     border-sky-200/60',     iconTint: 'icon-sky',     iconColor: 'text-sky-600',     border: 'group-hover:border-sky-200/60',     top: 'bg-gradient-to-r from-sky-400     to-sky-500'     },
  emerald: { tag: 'text-emerald-700 bg-emerald-50 border-emerald-200/60', iconTint: 'icon-emerald', iconColor: 'text-emerald-600', border: 'group-hover:border-emerald-200/60', top: 'bg-gradient-to-r from-emerald-400 to-emerald-500' },
  amber:   { tag: 'text-amber-700   bg-amber-50   border-amber-200/60',   iconTint: 'icon-amber',   iconColor: 'text-amber-600',   border: 'group-hover:border-amber-200/60',   top: 'bg-gradient-to-r from-amber-400   to-amber-500'   },
  pink:    { tag: 'text-pink-700    bg-pink-50    border-pink-200/60',    iconTint: 'icon-pink',    iconColor: 'text-pink-600',    border: 'group-hover:border-pink-200/60',    top: 'bg-gradient-to-r from-pink-400    to-pink-500'    },
}

export function BenefitsSection() {
  return (
    <section id="benefits" className="py-28 px-6 bg-[#F7F6FE] relative overflow-hidden">

      {/* Subtle radial glow */}
      <div
        className="absolute left-1/2 -translate-x-1/2 top-0 w-[900px] h-[500px]
          bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.07)_0%,transparent_65%)]
          pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-[11px] font-bold tracking-[0.14em] uppercase text-indigo-600 mb-4">
            Funcionalidades
          </span>
          <h2 className="text-[30px] sm:text-[40px] font-bold text-slate-900 leading-tight mb-5 tracking-tight">
            Tudo que você precisa para crescer
            <br className="hidden sm:block" />
            <span className="mktg-gradient-text">com consistência</span>
          </h2>
          <p className="max-w-xl mx-auto text-[16px] text-slate-500 leading-relaxed">
            Cada funcionalidade foi pensada para eliminar fricção — não para adicionar
            mais uma ferramenta na sua lista.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {benefits.map(({ icon: Icon, title, body, tag, accent }) => {
            const a = ACCENT[accent]
            return (
              <div
                key={title}
                className={`group relative bg-white border border-slate-100/80 ${a.border}
                  rounded-2xl p-6 overflow-hidden
                  shadow-[0_1px_4px_rgba(0,0,0,0.04)]
                  hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)]
                  transition-all duration-300 hover:-translate-y-1`}
              >
                {/* Top accent line on hover */}
                <span className={`absolute top-0 left-6 right-6 h-[2px] rounded-b ${a.top}
                  opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                {/* Icon + tag row */}
                <div className="flex items-start justify-between mb-5">
                  <div className={`icon-pill w-10 h-10 ${a.iconTint} ${a.iconColor}`}>
                    <Icon className="w-[17px] h-[17px]" strokeWidth={1.5} />
                  </div>
                  <span className={`text-[10px] font-bold tracking-wide uppercase border rounded-full px-2.5 py-1 ${a.tag}`}>
                    {tag}
                  </span>
                </div>

                <h3 className="text-[15px] font-semibold text-slate-900 mb-2 leading-snug">{title}</h3>
                <p className="text-[13px] text-slate-500 leading-relaxed">{body}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
