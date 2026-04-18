import Link from 'next/link'
import { Check, X, ArrowRight, Sparkles } from 'lucide-react'
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
    <section id="plans" className="py-28 px-6 bg-[#F7F6FE] relative overflow-hidden">

      {/* Background glow */}
      <div
        className="absolute left-1/2 -translate-x-1/2 top-1/3 w-[900px] h-[600px]
          bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.07)_0%,transparent_65%)]
          pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-[11px] font-bold tracking-[0.14em] uppercase text-indigo-600 mb-4">
            Preços transparentes
          </span>
          <h2 className="text-[30px] sm:text-[40px] font-bold text-slate-900 leading-tight mb-5 tracking-tight">
            Escolha o plano certo para você
          </h2>
          <p className="max-w-xl mx-auto text-[16px] text-slate-500 leading-relaxed">
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
                plan.highlight ? 'md:-mt-4 md:mb-4' : '',
              )}
            >
              {/* Gradient border for featured */}
              {plan.highlight && (
                <div className="absolute inset-0 rounded-2xl p-px pointer-events-none"
                  style={{background: 'linear-gradient(160deg, rgba(129,140,248,0.8) 0%, rgba(167,139,250,0.55) 40%, rgba(196,181,253,0.25) 75%, transparent 100%)'}} />
              )}

              <div className={cn(
                'relative flex flex-col h-full rounded-2xl p-7',
                plan.highlight
                  ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04),0_12px_48px_rgba(99,102,241,0.14)]'
                  : 'bg-white border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-250',
              )}>

                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute -top-[18px] left-1/2 -translate-x-1/2 z-10">
                    <span className="flex items-center gap-1.5 px-4 py-[5px]
                      bg-gradient-to-r from-indigo-500 to-violet-500
                      text-white text-[10px] font-semibold uppercase tracking-[0.12em]
                      rounded-full shadow-[0_2px_12px_rgba(99,102,241,0.4)]">
                      <Sparkles className="w-2.5 h-2.5" />
                      Mais popular
                    </span>
                  </div>
                )}

                {/* Top accent line for featured */}
                {plan.highlight && (
                  <div className="absolute top-0 left-8 right-8 h-px"
                    style={{background: 'linear-gradient(90deg, transparent, rgba(129,140,248,0.6), transparent)'}} />
                )}

                {/* Plan name */}
                <div className="mb-5 mt-1">
                  <h3 className={cn(
                    'text-[16px] font-bold mb-1.5',
                    plan.highlight ? 'text-indigo-700' : 'text-slate-900',
                  )}>
                    {plan.name}
                  </h3>
                  <p className="text-[13px] text-slate-500 leading-snug">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className={cn(
                      'text-[44px] font-extrabold leading-none tracking-tight',
                      plan.highlight ? 'mktg-gradient-text' : 'text-slate-900',
                    )}>
                      {plan.price}
                    </span>
                    <span className="text-[14px] text-slate-400">{plan.period}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">{plan.yearlyNote}</p>
                </div>

                {/* Limits */}
                <div className={cn(
                  'mb-5 pb-5 border-b space-y-2',
                  plan.highlight ? 'border-indigo-100' : 'border-slate-100',
                )}>
                  <p className="text-[13px] font-medium text-slate-700">{plan.brands}</p>
                  <p className="text-[13px] font-medium text-slate-700">{plan.posts}</p>
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
                          ? <Check className={cn('w-3.5 h-3.5 flex-shrink-0', plan.highlight ? 'text-indigo-500' : 'text-emerald-500')} />
                          : <X     className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                        }
                        <span className={included ? 'text-slate-700' : 'text-slate-400'}>
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
                    'group flex items-center justify-center gap-1.5 h-11 rounded-xl text-[14px] font-semibold transition-all duration-200',
                    plan.highlight
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-500 hover:from-indigo-500 hover:to-violet-400 text-white shadow-[0_4px_14px_rgba(99,102,241,0.4)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.5)] hover:-translate-y-px'
                      : 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 border border-slate-200/60 hover:border-slate-300/60',
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
        <p className="text-center text-[13px] text-slate-400">
          Todos os planos incluem 7 dias grátis para testar · Cancele a qualquer momento ·{' '}
          <Link href="/register" className="text-indigo-600 hover:text-indigo-700 transition-colors">
            Criar conta
          </Link>
        </p>
      </div>
    </section>
  )
}
