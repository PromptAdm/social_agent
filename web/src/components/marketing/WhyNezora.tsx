import { Clock, DollarSign, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react'

const comparisons = [
  {
    icon:  Clock,
    theme: 'amber',
    title: 'Fazer tudo no braço',
    pain:  '4–6h por semana pesquisando, escrevendo e agendando manualmente. Tempo que você poderia dedicar ao negócio.',
    gain:  'IA gera as sugestões, você ajusta em minutos. O calendário fica pronto em uma tarde.',
  },
  {
    icon:  DollarSign,
    theme: 'violet',
    title: 'Terceirizar para agência',
    pain:  'R$1.500–R$4.000/mês por uma gestão genérica que não conhece sua voz nem seus objetivos de negócio.',
    gain:  'Você mantém controle total da identidade da marca por R$49–R$199/mês.',
  },
  {
    icon:  AlertTriangle,
    theme: 'red',
    title: 'Empilhar ferramentas soltas',
    pain:  'Notion + Google Docs + Buffer + Canva + WhatsApp para aprovação. Cada ferramenta adiciona fricção.',
    gain:  'Uma plataforma com tudo integrado — sem reuniões de alinhamento ou abas abertas demais.',
  },
]

const THEME: Record<string, { dot: string; icon: string; bar: string }> = {
  amber:  { dot: 'bg-amber-500/10  border-amber-500/20',  icon: 'text-amber-400',  bar: 'bg-amber-500/20'  },
  violet: { dot: 'bg-violet-500/10 border-violet-500/20', icon: 'text-violet-400', bar: 'bg-violet-500/20' },
  red:    { dot: 'bg-red-500/10    border-red-500/20',    icon: 'text-red-400',    bar: 'bg-red-500/20'    },
}

export function WhyNezora() {
  return (
    <section id="why" className="py-28 px-5 relative overflow-hidden">

      {/* Background accent */}
      <div
        className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px
          bg-gradient-to-r from-transparent via-[#1A1A24] to-transparent pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-[11px] font-bold tracking-[0.12em] uppercase text-indigo-400 mb-4">
            Por que Nezora
          </span>
          <h2 className="text-[32px] sm:text-[40px] font-bold text-slate-100 leading-tight mb-5">
            Outras abordagens têm um custo real.
          </h2>
          <p className="max-w-xl mx-auto text-[16px] text-slate-400 leading-relaxed">
            Você já está pagando — em tempo, dinheiro ou sanidade.
            Só não aparece em nenhuma nota fiscal.
          </p>
        </div>

        {/* Comparison rows */}
        <div className="space-y-4">
          {comparisons.map(({ icon: Icon, theme, title, pain, gain }) => {
            const t = THEME[theme]
            return (
              <div
                key={title}
                className="group grid grid-cols-1 md:grid-cols-2 bg-[#0D0D14]
                  border border-[#1A1A24] hover:border-[#252530] rounded-2xl overflow-hidden
                  transition-colors duration-300"
              >
                {/* Pain side */}
                <div className="relative p-7 border-b md:border-b-0 md:border-r border-[#1A1A24]">
                  {/* Top accent bar */}
                  <div className={`absolute top-0 left-6 right-6 h-px ${t.bar} opacity-60`} />

                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${t.dot}`}>
                      <Icon className={`w-4 h-4 ${t.icon}`} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-slate-600 mb-0.5">
                        Sem Nezora
                      </p>
                      <h3 className="text-[15px] font-semibold text-slate-300">{title}</h3>
                    </div>
                  </div>
                  <p className="text-[13px] text-slate-500 leading-relaxed pl-13 ml-[52px]">{pain}</p>
                </div>

                {/* Gain side */}
                <div className="relative p-7 bg-indigo-600/[0.04] group-hover:bg-indigo-600/[0.07] transition-colors duration-300">
                  {/* Top accent bar */}
                  <div className="absolute top-0 left-6 right-6 h-px bg-indigo-500/30" />

                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600/15 border border-indigo-500/25 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-indigo-500/70 mb-0.5">
                        Com Nezora
                      </p>
                      <span className="text-[15px] font-semibold text-indigo-300">Solução integrada</span>
                    </div>
                  </div>

                  <p className="text-[13px] text-slate-400 leading-relaxed ml-[52px]">{gain}</p>

                  <div className="mt-5 ml-[52px]">
                    <a
                      href="/register"
                      className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors group/link"
                    >
                      Ver como funciona
                      <ArrowRight className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform" />
                    </a>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
