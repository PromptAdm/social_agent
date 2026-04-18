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

const ACCENT: Record<string, { tag: string; icon: string; top: string }> = {
  indigo:  { tag: 'text-indigo-400  bg-indigo-500/10  border-indigo-500/20',  icon: 'bg-indigo-600/15  border-indigo-500/20  text-indigo-400',  top: 'bg-indigo-500'  },
  violet:  { tag: 'text-violet-400  bg-violet-500/10  border-violet-500/20',  icon: 'bg-violet-600/15  border-violet-500/20  text-violet-400',  top: 'bg-violet-500'  },
  sky:     { tag: 'text-sky-400     bg-sky-500/10     border-sky-500/20',     icon: 'bg-sky-600/15     border-sky-500/20     text-sky-400',     top: 'bg-sky-500'     },
  emerald: { tag: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: 'bg-emerald-600/15 border-emerald-500/20 text-emerald-400', top: 'bg-emerald-500' },
  amber:   { tag: 'text-amber-400   bg-amber-500/10   border-amber-500/20',   icon: 'bg-amber-600/15   border-amber-500/20   text-amber-400',   top: 'bg-amber-500'   },
  pink:    { tag: 'text-pink-400    bg-pink-500/10    border-pink-500/20',    icon: 'bg-pink-600/15    border-pink-500/20    text-pink-400',    top: 'bg-pink-500'    },
} as const

export function BenefitsSection() {
  return (
    <section id="benefits" className="py-28 px-5 relative overflow-hidden">

      {/* Background glow */}
      <div
        className="absolute left-1/2 top-0 -translate-x-1/2 w-[1000px] h-[700px]
          bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.06)_0%,transparent_70%)] pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-[11px] font-bold tracking-[0.14em] uppercase text-indigo-400 mb-4">
            O que você ganha
          </span>
          <h2 className="text-[32px] sm:text-[42px] font-bold text-slate-100 leading-tight mb-5">
            Tudo que você precisa para{' '}
            <span className="gradient-text">crescer com consistência</span>
          </h2>
          <p className="max-w-xl mx-auto text-[16px] text-slate-400 leading-relaxed">
            Cada funcionalidade foi pensada para eliminar fricção — não para adicionar
            mais uma ferramenta na sua lista.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {benefits.map(({ icon: Icon, title, body, tag, accent }) => {
            const a = ACCENT[accent]
            return (
              <div
                key={title}
                className="group relative bg-[#0D0D14] border border-[#1A1A24]
                  hover:border-[#27273A] rounded-2xl p-6 overflow-hidden
                  transition-all duration-300 hover:-translate-y-1
                  hover:shadow-xl hover:shadow-black/50"
              >
                {/* Top accent line */}
                <span className={`absolute top-0 left-6 right-6 h-[2px] rounded-b ${a.top}
                  opacity-0 group-hover:opacity-60 transition-opacity duration-300`} />

                {/* Tag */}
                <span className={`inline-flex items-center text-[9px] font-bold uppercase
                  tracking-wider border px-2 py-0.5 rounded-full mb-4 ${a.tag}`}>
                  {tag}
                </span>

                {/* Icon */}
                <div className={`w-10 h-10 border rounded-xl flex items-center justify-center mb-4
                  transition-all duration-300 ${a.icon}`}>
                  <Icon className="w-4.5 h-4.5" />
                </div>

                <h3 className="text-[15px] font-semibold text-slate-200 mb-2 leading-snug">{title}</h3>
                <p className="text-[13px] text-slate-500 leading-relaxed">{body}</p>

                {/* Hover gradient overlay */}
                <div className="absolute inset-0 rounded-2xl
                  bg-gradient-to-br from-indigo-600/0 to-violet-600/0
                  group-hover:from-indigo-600/3 group-hover:to-violet-600/2
                  transition-all duration-300 pointer-events-none" />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
