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

const THEME: Record<string, { bg: string; border: string; iconTint: string; iconText: string; bar: string }> = {
  amber:  { bg: 'bg-amber-50',  border: 'border-amber-100',  iconTint: 'icon-amber',  iconText: 'text-amber-600',  bar: 'bg-amber-200'  },
  violet: { bg: 'bg-violet-50', border: 'border-violet-100', iconTint: 'icon-violet', iconText: 'text-violet-600', bar: 'bg-violet-200' },
  red:    { bg: 'bg-red-50',    border: 'border-red-100',    iconTint: 'icon-red',    iconText: 'text-red-600',    bar: 'bg-red-200'    },
}

export function WhyNezora() {
  return (
    <section id="why" className="py-28 px-6 bg-white relative overflow-hidden">

      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-[11px] font-bold tracking-[0.14em] uppercase text-indigo-600 mb-4">
            Por que Nezora
          </span>
          <h2 className="text-[30px] sm:text-[40px] font-bold text-slate-900 leading-tight mb-5 tracking-tight">
            Outras abordagens têm um custo real.
          </h2>
          <p className="max-w-xl mx-auto text-[16px] text-slate-500 leading-relaxed">
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
                className="group grid grid-cols-1 md:grid-cols-2 bg-white
                  border border-slate-100/80 hover:border-slate-200/80
                  rounded-2xl overflow-hidden
                  shadow-[0_1px_3px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.03)]
                  hover:shadow-[0_4px_24px_rgba(0,0,0,0.08)]
                  hover:-translate-y-0.5
                  transition-all duration-250"
              >
                {/* Pain side */}
                <div className={`relative p-7 border-b md:border-b-0 md:border-r ${t.bg} ${t.border}/60 transition-colors duration-250`}>
                  {/* Top accent bar */}
                  <div className={`absolute top-0 left-0 right-0 h-[3px] ${t.bar} opacity-50`} />

                  <div className="flex items-start gap-4 mb-4">
                    <div className={`icon-pill w-9 h-9 ${t.iconTint}`}>
                      <Icon className={`w-4 h-4 ${t.iconText}`} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-slate-400 mb-0.5">
                        Sem Nezora
                      </p>
                      <h3 className="text-[15px] font-semibold text-slate-800">{title}</h3>
                    </div>
                  </div>
                  <p className="text-[13px] text-slate-500 leading-relaxed ml-[52px]">{pain}</p>
                </div>

                {/* Gain side */}
                <div className="relative p-7 bg-gradient-to-br from-indigo-50/50 to-violet-50/20
                  group-hover:from-indigo-50/80 group-hover:to-violet-50/40 transition-colors duration-250">
                  {/* Top accent bar */}
                  <div className="absolute top-0 left-0 right-0 h-[3px]"
                    style={{background: 'linear-gradient(90deg, #818cf8, #a78bfa)'}} />

                  <div className="flex items-start gap-4 mb-4">
                    <div className="icon-pill icon-indigo w-9 h-9">
                      <CheckCircle2 className="w-4 h-4 text-indigo-600" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-indigo-400 mb-0.5">
                        Com Nezora
                      </p>
                      <span className="text-[15px] font-semibold text-indigo-700">Solução integrada</span>
                    </div>
                  </div>

                  <p className="text-[13px] text-slate-600 leading-relaxed ml-[52px]">{gain}</p>

                  <div className="mt-5 ml-[52px]">
                    <a href="/register"
                      className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-indigo-600 hover:text-indigo-700 transition-colors group/link">
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
