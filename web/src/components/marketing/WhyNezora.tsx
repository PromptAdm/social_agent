import { Clock, DollarSign, AlertTriangle, CheckCircle2 } from 'lucide-react'

const comparisons = [
  {
    icon:  Clock,
    theme: 'amber',
    title: 'Fazer tudo no braço',
    pain:  '4–6h por semana pesquisando, escrevendo e agendando manualmente. Tempo que você poderia dedicar ao negócio.',
    gain:  'Com Nezora: IA gera as sugestões, você ajusta em minutos. O calendário fica pronto em uma tarde.',
  },
  {
    icon:  DollarSign,
    theme: 'violet',
    title: 'Terceirizar para agência',
    pain:  'R$1.500–R$4.000/mês por uma gestão genérica que não conhece sua voz nem seus objetivos de negócio.',
    gain:  'Com Nezora: você mantém controle total da identidade da marca por R$49–R$199/mês.',
  },
  {
    icon:  AlertTriangle,
    theme: 'red',
    title: 'Empilhar ferramentas soltas',
    pain:  'Notion + Google Docs + Buffer + Canva + WhatsApp para aprovação. Cada ferramenta adiciona fricção.',
    gain:  'Com Nezora: uma plataforma com tudo integrado — sem reuniões de alinhamento ou abas abertas demais.',
  },
]

export function WhyNezora() {
  return (
    <section id="why" className="py-28 px-5">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-[11px] font-bold tracking-[0.12em] uppercase text-indigo-400 mb-4">
            Por que Nezora
          </span>
          <h2 className="text-[32px] sm:text-[40px] font-bold text-slate-100 leading-tight mb-5">
            Outras abordagens têm um custo real.
            <span className="block text-slate-400 font-normal text-[26px] sm:text-[32px] mt-2">
              Você já está pagando — só não vê na nota fiscal.
            </span>
          </h2>
        </div>

        {/* Comparison rows */}
        <div className="space-y-5">
          {comparisons.map(({ icon: Icon, theme, title, pain, gain }) => (
            <div
              key={title}
              className="grid grid-cols-1 md:grid-cols-2 gap-0 bg-[#0F0F17] border border-[#1E1E2A] rounded-2xl overflow-hidden"
            >
              {/* Pain side */}
              <div className="p-6 border-b md:border-b-0 md:border-r border-[#1E1E2A]">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    theme === 'amber'  ? 'bg-amber-500/10  border border-amber-500/20' :
                    theme === 'violet' ? 'bg-violet-500/10 border border-violet-500/20' :
                                         'bg-red-500/10    border border-red-500/20'
                  }`}>
                    <Icon className={`w-4 h-4 ${
                      theme === 'amber'  ? 'text-amber-400' :
                      theme === 'violet' ? 'text-violet-400' :
                                           'text-red-400'
                    }`} />
                  </div>
                  <h3 className="text-[14px] font-semibold text-slate-300">{title}</h3>
                </div>
                <p className="text-[13px] text-slate-500 leading-relaxed">{pain}</p>
              </div>

              {/* Gain side (Nezora) */}
              <div className="p-6 bg-indigo-600/5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600/15 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                  </div>
                  <span className="text-[14px] font-semibold text-indigo-400">Com Nezora</span>
                </div>
                <p className="text-[13px] text-slate-400 leading-relaxed">{gain}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
