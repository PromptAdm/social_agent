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
    <section id="proposal" className="py-28 px-5">
      <div className="max-w-5xl mx-auto">

        {/* Section label */}
        <div className="text-center mb-16">
          <span className="inline-block text-[11px] font-bold tracking-[0.12em] uppercase text-indigo-400 mb-4">
            Para quem é o Nezora
          </span>
          <h2 className="text-[32px] sm:text-[40px] font-bold text-slate-100 leading-tight mb-5">
            Redes sociais consistentes não deveriam{' '}
            <br className="hidden sm:block" />
            custar seu dia inteiro
          </h2>
          <p className="max-w-xl mx-auto text-[16px] text-slate-400 leading-relaxed">
            Nezora foi construído para quem quer resultados reais no social sem precisar
            contratar uma equipe de 5 pessoas ou passar horas reinventando o que postar.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {audiences.map(({ icon: Icon, title, description }, i) => (
            <div
              key={title}
              className="group relative bg-[#0D0D14] border border-[#1A1A24]
                hover:border-indigo-500/25 rounded-2xl p-6 overflow-hidden
                transition-all duration-300 hover:-translate-y-1
                hover:shadow-xl hover:shadow-black/50"
            >
              {/* Number hint */}
              <span className="absolute top-5 right-5 text-[40px] font-black text-slate-800/30 leading-none select-none">
                {i + 1}
              </span>

              <div className="w-11 h-11 bg-indigo-600/12 border border-indigo-500/20 rounded-xl flex items-center justify-center mb-5 group-hover:bg-indigo-600/20 group-hover:border-indigo-500/30 transition-all">
                <Icon className="w-5 h-5 text-indigo-400" />
              </div>

              <h3 className="text-[16px] font-semibold text-slate-100 mb-2.5 leading-snug">{title}</h3>
              <p className="text-[13px] text-slate-400 leading-relaxed">{description}</p>

              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-600/0 to-violet-600/0 group-hover:from-indigo-600/3 group-hover:to-violet-600/2 transition-all duration-300 pointer-events-none" />
            </div>
          ))}
        </div>

        {/* Divider quote */}
        <div className="mt-16 text-center">
          <blockquote className="text-[17px] text-slate-400 italic max-w-2xl mx-auto leading-relaxed">
            &ldquo;O problema não é falta de criatividade.{' '}
            <span className="text-slate-200 not-italic font-medium">
              É falta de sistema.
            </span>
            &rdquo;
          </blockquote>
        </div>
      </div>
    </section>
  )
}
