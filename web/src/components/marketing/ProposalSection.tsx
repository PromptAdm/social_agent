import { Target, Users, TrendingUp } from 'lucide-react'

const audiences = [
  {
    icon: Target,
    title: 'Empreendedores solo',
    description: 'Você cuida de tudo sozinho e não tem tempo para pensar em conteúdo todos os dias. O Nezora faz o trabalho pesado por você.',
  },
  {
    icon: Users,
    title: 'Pequenas equipes',
    description: 'Marketing e criação divididos entre poucas pessoas. Com Nezora, todo o fluxo — ideia, aprovação, publicação — fica em um só lugar.',
  },
  {
    icon: TrendingUp,
    title: 'Agências e consultores',
    description: 'Gerenciar múltiplas marcas com qualidade e rastreabilidade. Nezora separa cada cliente em sua própria marca, com analytics individuais.',
  },
]

export function ProposalSection() {
  return (
    <section id="proposal" className="py-28 px-6 bg-white">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-[11px] font-bold tracking-[0.14em] uppercase text-indigo-600 mb-4">
            Para quem é o Nezora
          </span>
          <h2 className="text-[30px] sm:text-[40px] font-bold text-slate-900 leading-tight mb-5 tracking-tight">
            Redes sociais consistentes não deveriam{' '}
            <br className="hidden sm:block" />
            custar seu dia inteiro
          </h2>
          <p className="max-w-xl mx-auto text-[16px] text-slate-500 leading-relaxed">
            Nezora foi construído para quem quer resultados reais no social sem precisar
            contratar uma equipe de 5 pessoas ou passar horas reinventando o que postar.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {audiences.map(({ icon: Icon, title, description }, i) => (
            <div
              key={title}
              className="group relative bg-white border border-slate-100
                hover:border-indigo-200/60 rounded-2xl p-7 overflow-hidden
                shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.04)]
                hover:shadow-[0_4px_20px_rgba(79,70,229,0.08),0_16px_48px_rgba(0,0,0,0.08)]
                transition-all duration-300 hover:-translate-y-1"
            >
              {/* Number */}
              <span className="absolute top-5 right-6 text-[52px] font-black text-slate-900 leading-none select-none">
                {i + 1}
              </span>

              {/* Icon */}
              <div className="icon-pill icon-indigo w-11 h-11 mb-5">
                <Icon className="w-5 h-5 text-indigo-600" strokeWidth={1.5} />
              </div>

              <h3 className="text-[16px] font-semibold text-slate-900 mb-2.5 leading-snug">{title}</h3>
              <p className="text-[13px] text-slate-500 leading-relaxed">{description}</p>

              {/* Hover gradient tint */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-50/0 to-violet-50/0
                group-hover:from-indigo-50/30 group-hover:to-violet-50/20
                transition-all duration-300 pointer-events-none" />
            </div>
          ))}
        </div>

        {/* Divider quote */}
        <div className="mt-16 text-center">
          <blockquote className="text-[17px] text-slate-400 italic max-w-2xl mx-auto leading-relaxed">
            &ldquo;O problema não é falta de criatividade.{' '}
            <span className="text-slate-700 not-italic font-medium">
              É falta de sistema.
            </span>
            &rdquo;
          </blockquote>
        </div>
      </div>
    </section>
  )
}
