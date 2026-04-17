import Link from 'next/link'
import { Check, X, ArrowRight, Zap } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const plans = [
  {
    id:           'starter',
    name:         'Starter',
    price:        'R$49',
    period:       '/mês',
    yearlyNote:   'R$39/mês no plano anual',
    description:  'Ideal para começar e manter consistência.',
    brands:       '3 marcas',
    posts:        '100 posts/mês',
    cta:          'Começar no Starter',
    popular:      false,
    highlight:    false,
  },
  {
    id:           'professional',
    name:         'Professional',
    price:        'R$99',
    period:       '/mês',
    yearlyNote:   'R$79/mês no plano anual',
    description:  'Para equipes e quem leva redes sociais a sério.',
    brands:       '10 marcas',
    posts:        '500 posts/mês',
    cta:          'Começar no Pro',
    popular:      true,
    highlight:    true,
  },
  {
    id:           'premium',
    name:         'Premium',
    price:        'R$199',
    period:       '/mês',
    yearlyNote:   'R$159/mês no plano anual',
    description:  'Para agências e operações sem limites.',
    brands:       'Marcas ilimitadas',
    posts:        'Posts ilimitados',
    cta:          'Começar no Premium',
    popular:      false,
    highlight:    false,
  },
]

const featureMatrix = [
  { label: 'Geração de conteúdo com IA',    starter: true,  pro: true,  premium: true  },
  { label: 'Calendário editorial',           starter: true,  pro: true,  premium: true  },
  { label: 'Agendamento de posts',           starter: true,  pro: true,  premium: true  },
  { label: 'Fluxo de aprovação',             starter: false, pro: true,  premium: true  },
  { label: 'Analytics avançado',             starter: false, pro: true,  premium: true  },
  { label: 'Múltiplas marcas',               starter: false, pro: true,  premium: true  },
  { label: 'Posts e marcas ilimitados',      starter: false, pro: false, premium: true  },
  { label: 'Suporte prioritário',            starter: false, pro: false, premium: true  },
]

export function PlansSection() {
  return (
    <section id="plans" className="py-28 px-5 relative overflow-hidden">

      {/* Glow */}
      <div
        className="absolute left-1/2 -translate-x-1/2 top-1/4 w-[800px] h-[600px] bg-violet-600/5 rounded-full blur-[160px] pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-[11px] font-bold tracking-[0.12em] uppercase text-indigo-400 mb-4">
            Preços transparentes
          </span>
          <h2 className="text-[32px] sm:text-[40px] font-bold text-slate-100 leading-tight mb-5">
            Escolha o plano certo para você
          </h2>
          <p className="max-w-xl mx-auto text-[16px] text-slate-400 leading-relaxed">
            Comece no Starter e faça upgrade quando precisar.
            Sem surpresas, sem cobranças ocultas.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                'relative flex flex-col rounded-2xl p-6 transition-all',
                plan.highlight
                  ? 'bg-indigo-600/8 border-2 border-indigo-500/40 ring-1 ring-indigo-500/15 shadow-2xl shadow-indigo-600/10'
                  : 'bg-[#0F0F17] border border-[#1E1E2A]',
              )}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="flex items-center gap-1 px-3.5 py-1 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg shadow-indigo-600/40">
                    <Zap className="w-2.5 h-2.5" />
                    Mais popular
                  </span>
                </div>
              )}

              {/* Plan name */}
              <div className="mb-5">
                <h3 className="text-[16px] font-semibold text-slate-100 mb-1.5">{plan.name}</h3>
                <p className="text-[13px] text-slate-500 leading-snug">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-[38px] font-bold text-slate-100 leading-none">{plan.price}</span>
                  <span className="text-[14px] text-slate-500">{plan.period}</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1">{plan.yearlyNote}</p>
              </div>

              {/* Limits */}
              <div className="mb-5 pb-5 border-b border-[#1E1E2A] space-y-1.5">
                <p className="text-[13px] text-slate-400">
                  <span className="text-slate-200 font-medium">{plan.brands}</span>
                </p>
                <p className="text-[13px] text-slate-400">
                  <span className="text-slate-200 font-medium">{plan.posts}</span>
                </p>
              </div>

              {/* Features */}
              <ul className="flex-1 mb-7 space-y-2">
                {featureMatrix.map(({ label, starter, pro, premium }) => {
                  const included =
                    plan.id === 'starter'      ? starter :
                    plan.id === 'professional' ? pro     : premium
                  return (
                    <li key={label} className="flex items-center gap-2 text-[13px]">
                      {included
                        ? <Check className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                        : <X     className="w-3.5 h-3.5 text-slate-700 flex-shrink-0" />
                      }
                      <span className={included ? 'text-slate-300' : 'text-slate-600'}>{label}</span>
                    </li>
                  )
                })}
              </ul>

              {/* CTA */}
              <Link
                href="/register"
                className={cn(
                  'group flex items-center justify-center gap-1.5 h-10 rounded-xl text-[14px] font-semibold transition-all',
                  plan.highlight
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 hover:shadow-indigo-500/30 hover:-translate-y-0.5'
                    : 'bg-[#17171F] hover:bg-[#1F1F2B] border border-[#2A2A38] hover:border-[#3A3A4A] text-slate-300 hover:text-slate-100',
                )}
              >
                {plan.cta}
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          ))}
        </div>

        {/* Footnote */}
        <p className="text-center text-[13px] text-slate-600">
          Todos os planos incluem 7 dias grátis para testar · Cancele a qualquer momento ·{' '}
          <Link href="/register" className="text-indigo-400 hover:text-indigo-300 transition-colors">
            Criar conta
          </Link>
        </p>
      </div>
    </section>
  )
}
