import { Zap, CalendarDays, CheckSquare, BarChart3, Building2, Layers } from 'lucide-react'

const benefits = [
  {
    icon:  Zap,
    title: 'Geração de conteúdo com IA',
    body:  'Descreva sua marca e objetivo — o Nezora sugere ideias, títulos e textos prontos para adaptar. Sem a tela em branco.',
    tag:   'IA integrada',
  },
  {
    icon:  CalendarDays,
    title: 'Calendário editorial visual',
    body:  'Planeje semanas de conteúdo de uma vez. Veja o que está agendado, o que está pendente e o que ainda precisa de texto.',
    tag:   'Planejamento',
  },
  {
    icon:  CheckSquare,
    title: 'Fluxo de aprovação',
    body:  'Chefe aprova antes de publicar? Clientes precisam dar ok? O Nezora tem um fluxo de aprovação simples e rastreável.',
    tag:   'Colaboração',
  },
  {
    icon:  BarChart3,
    title: 'Analytics que fazem sentido',
    body:  'Veja quais posts geraram mais engajamento, qual horário funciona melhor e como sua marca evolui semana a semana.',
    tag:   'Dados reais',
  },
  {
    icon:  Building2,
    title: 'Múltiplas marcas',
    body:  'Gerencie perfis separados para cada cliente ou projeto, com histórico e dados completamente independentes.',
    tag:   'Multi-brand',
  },
  {
    icon:  Layers,
    title: 'Tudo em um só lugar',
    body:  'Sem saltar entre Notion, Google Docs, Canva e planilhas. Ideias, textos, aprovações e publicações dentro do Nezora.',
    tag:   'Produtividade',
  },
]

export function BenefitsSection() {
  return (
    <section id="benefits" className="py-28 px-5 relative overflow-hidden">

      {/* Background subtle glow */}
      <div
        className="absolute left-1/2 top-0 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-600/4 rounded-full blur-[160px] pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-[11px] font-bold tracking-[0.12em] uppercase text-indigo-400 mb-4">
            O que você ganha
          </span>
          <h2 className="text-[32px] sm:text-[40px] font-bold text-slate-100 leading-tight mb-5">
            Tudo que você precisa para{' '}
            <span className="gradient-text">crescer com consistência</span>
          </h2>
          <p className="max-w-xl mx-auto text-[16px] text-slate-400 leading-relaxed">
            Cada funcionalidade foi pensada para eliminar fricção — não para adicionar mais uma ferramenta na sua lista.
          </p>
        </div>

        {/* Benefits grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {benefits.map(({ icon: Icon, title, body, tag }) => (
            <div
              key={title}
              className="group relative bg-[#0F0F17] border border-[#1E1E2A] hover:border-[#2A2A3A] rounded-2xl p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40"
            >
              {/* Tag */}
              <span className="inline-block text-[9px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-600/10 border border-indigo-500/20 px-2 py-0.5 rounded-full mb-4">
                {tag}
              </span>

              {/* Icon */}
              <div className="w-9 h-9 bg-[#17171F] border border-[#27273A] rounded-xl flex items-center justify-center mb-4 group-hover:border-indigo-500/20 group-hover:bg-indigo-600/10 transition-all">
                <Icon className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 transition-colors" />
              </div>

              <h3 className="text-[15px] font-semibold text-slate-200 mb-2">{title}</h3>
              <p className="text-[13px] text-slate-500 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
