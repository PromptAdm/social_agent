import Link from 'next/link'
import { Check, X, ArrowRight, Zap, Sparkles } from 'lucide-react'
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

      {/* Background glow */}
      <div
        className="absolute left-1/2 -translate-x-1/2 top-1/3 w-[900px] h-[600px]
          bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.09)_0%,transparent_65%)]
          pointer-events-none"
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14 items-start">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                'relative flex flex-col rounded-2xl transition-all duration-300',
                plan.highlight
                  ? 'md:-mt-3 md:mb-3'
                  : '',
              )}
            >
              {/* Gradient border wrapper for featured plan */}
              {plan.highlight && (
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-indigo-500/50 via-violet-500/30 to-transparent p-px pointer-events-none" />
              )}

              <div
                className={cn(
                  'relative flex flex-col h-full rounded-2xl p-6',
                  plan.highlight
                    ? 'bg-[#0D0D17] shadow-2xl shadow-indigo-600/20'
                    : 'bg-[#0D0D14] border border-[#1A1A24] hover:border-[#2A2A38] transition-colors',
                )}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <span className="flex items-center gap-1.5 px-4 py-1.5
                      bg-gradient-to-r from-indigo-600 to-violet-600
                      text-white text-[10px] font-bold uppercase tracking-widest
                      rounded-full shadow-lg shadow-indigo-600/40">
                      <Sparkles className="w-2.5 h-2.5" />
                      Mais popular
                    </span>
                  </div>
                )}

                {/* Top accent line for featured */}
                {plan.highlight && (
                  <div className="absolute top-0 inset-x-6 h-px bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent rounded-full" />
                )}

                {/* Plan name */}
                <div className="mb-5 mt-1">
                  <h3 className={cn(
                    'text-[16px] font-semibold mb-1.5',
                    plan.highlight ? 'text-indigo-300' : 'text-slate-200',
                  )}>
                    {plan.name}
                  </h3>
                  <p className="text-[13px] text-slate-500 leading-snug">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className={cn(
                      'text-[42px] font-bold leading-none',
                      plan.highlight ? 'gradient-text-shimmer' : 'text-slate-100',
                    )}>
                      {plan.price}
                    </span>
                    <span className="text-[14px] text-slate-500">{plan.period}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1.5">{plan.yearlyNote}</p>
                </div>

                {/* Limits */}
                <div className={cn(
                  'mb-5 pb-5 border-b space-y-2',
                  plan.highlight ? 'border-indigo-500/15' : 'border-[#1A1A24]',
                )}>
                  <p className="text-[13px]">
                    <span className={cn('font-medium', plan.highlight ? 'text-indigo-200' : 'text-slate-200')}>
                      {plan.brands}
                    </span>
                  </p>
                  <p className="text-[13px]">
                    <span className={cn('font-medium', plan.highlight ? 'text-indigo-200' : 'text-slate-200')}>
                      {plan.posts}
                    </span>
                  </p>
                </div>

                {/* Features */}
                <ul className="flex-1 mb-7 space-y-2.5">
                  {featureMatrix.map(({ label, starter, pro, premium }) => {
                    const included =
                      plan.id === 'starter'      ? starter :
                      plan.id === 'professional' ? pro     : premium
                    return (
                      <li key={label} className="flex items-center gap-2.5 text-[13px]">
                        {included
                          ? <Check className={cn('w-3.5 h-3.5 flex-shrink-0', plan.highlight ? 'text-indigo-400' : 'text-emerald-500/70')} />
                          : <X     className="w-3.5 h-3.5 text-slate-700 flex-shrink-0" />
                        }
                        <span className={included ? (plan.highlight ? 'text-slate-200' : 'text-slate-300') : 'text-slate-600'}>
                          {label}
                        </span>
                      </li>
                    )
                  })}
                </ul>

                {/* CTA */}
                <Link
                  href="/register"
                  className={cn(
                    'group flex items-center justify-center gap-1.5 h-11 rounded-xl text-[14px] font-semibold transition-all',
                    plan.highlight
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-violet-500 text-white shadow-xl shadow-indigo-600/30 hover:shadow-indigo-500/40 hover:-translate-y-0.5'
                      : 'bg-[#13131B] hover:bg-[#1A1A24] border border-[#1E1E2A] hover:border-[#2E2E3E] text-slate-400 hover:text-slate-200',
                  )}
                >
                  {plan.cta}
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
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
