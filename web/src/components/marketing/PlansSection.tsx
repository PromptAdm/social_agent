'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useAuthStore } from '@/store/authStore'
import { billingService } from '@/services/billingService'
import { toast } from '@/store/uiStore'

const VALID_PLANS = new Set(['starter', 'professional', 'premium'])

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 'R$49',
    period: '/mês',
    yearlyNote: 'R$39/mês no plano anual',
    description: 'Ideal para começar e manter consistência.',
    brands: '3 marcas',
    posts: '100 posts/mês',
    cta: 'Começar no Starter',
    popular: false,
    highlight: false,
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 'R$99',
    period: '/mês',
    yearlyNote: 'R$79/mês no plano anual',
    description: 'Para equipes e quem leva redes sociais a sério.',
    brands: '10 marcas',
    posts: '500 posts/mês',
    cta: 'Começar no Pro',
    popular: true,
    highlight: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 'R$199',
    period: '/mês',
    yearlyNote: 'R$159/mês no plano anual',
    description: 'Para agências e operações sem limites.',
    brands: 'Marcas ilimitadas',
    posts: 'Posts ilimitados',
    cta: 'Começar no Premium',
    popular: false,
    highlight: false,
  },
]

const featureMatrix = [
  { label: 'Geração de conteúdo com IA', starter: true,  pro: true,  premium: true  },
  { label: 'Calendário editorial',        starter: true,  pro: true,  premium: true  },
  { label: 'Agendamento de posts',        starter: true,  pro: true,  premium: true  },
  { label: 'Fluxo de aprovação',          starter: false, pro: true,  premium: true  },
  { label: 'Analytics avançado',          starter: false, pro: true,  premium: true  },
  { label: 'Múltiplas marcas',            starter: false, pro: true,  premium: true  },
  { label: 'Posts e marcas ilimitados',   starter: false, pro: false, premium: true  },
  { label: 'Suporte prioritário',         starter: false, pro: false, premium: true  },
]

export function PlansSection() {
  const router          = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isAuthLoading   = useAuthStore((s) => s.isLoading)
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  async function handleCheckout(planId: string) {
    console.log('[checkout] clicked plan:', planId, { isAuthenticated, isAuthLoading })

    if (loadingPlan || !VALID_PLANS.has(planId)) return

    // Auth state still unknown — aguarda hidratação (evita redirect errado)
    if (isAuthLoading) {
      toast.info('Aguarde um momento...')
      return
    }

    // Usuário não autenticado → vai para login com o plano selecionado
    if (!isAuthenticated) {
      router.push(`/login?plan=${planId}`)
      return
    }

    // Usuário autenticado → tenta checkout direto
    const payload = {
      plan_code:                 planId,
      billing_cycle:             'monthly' as const,
      payment_method_preference: 'card'    as const,
    }
    console.log('[checkout] sending payload:', payload)

    setLoadingPlan(planId)
    try {
      const result = await billingService.createCheckoutSession(payload)
      console.log('[checkout] response:', result)

      if (!result?.checkout_url) {
        console.error('[checkout] missing checkout_url in response:', result)
        throw new Error('Missing checkout_url')
      }

      window.location.href = result.checkout_url
    } catch (err: any) {
      // parseApiError no interceptor Axios rejeita com string — usar direto
      console.error('[checkout] error (raw):', err)
      const message = typeof err === 'string'
        ? err
        : (err?.response?.data?.detail ?? err?.message ?? 'Erro ao iniciar pagamento.')

      if (message.includes('não disponíveis') || message.includes('em breve')) {
        toast.info(message)
      } else if (message.includes('conexão') || message.includes('servidor')) {
        toast.error('Servidor indisponível. Tente novamente mais tarde.')
      } else {
        toast.error(message)
      }
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <section id="plans" className="py-24 bg-[#F5F4FB]">
      <div className="max-w-6xl mx-auto px-4">

        {/* Header */}
        <div className="text-center mb-14">
          <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-indigo-500 mb-3">
            Planos
          </p>
          <h2 className="text-4xl font-bold text-slate-900 tracking-tight mb-4">
            Simples, transparente, sem surpresas.
          </h2>
          <p className="text-[15px] text-slate-500 max-w-xl mx-auto">
            Escolha o plano ideal para o seu crescimento. Todos incluem 7 dias grátis.
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {plans.map((plan) => {
            const isLoading = loadingPlan === plan.id

            return (
              <div
                key={plan.id}
                className={cn(
                  'relative flex flex-col rounded-2xl p-7 transition-shadow',
                  plan.highlight
                    ? 'bg-[#18181B] text-white shadow-[0_16px_48px_rgba(0,0,0,0.22)] ring-1 ring-white/10'
                    : 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80',
                )}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full
                      bg-indigo-600 text-white text-[11px] font-semibold tracking-wide shadow-lg">
                      <Sparkles className="w-3 h-3" />
                      Mais popular
                    </span>
                  </div>
                )}

                {/* Plan name + description */}
                <div className="mb-6">
                  <h3 className={cn(
                    'text-[13px] font-bold uppercase tracking-[0.1em] mb-1',
                    plan.highlight ? 'text-slate-400' : 'text-slate-400',
                  )}>
                    {plan.name}
                  </h3>
                  <p className={cn(
                    'text-[13.5px] leading-snug',
                    plan.highlight ? 'text-slate-400' : 'text-slate-500',
                  )}>
                    {plan.description}
                  </p>
                </div>

                {/* Price */}
                <div className="mb-1">
                  <span className={cn(
                    'text-4xl font-bold tracking-tight',
                    plan.highlight ? 'text-white' : 'text-slate-900',
                  )}>
                    {plan.price}
                  </span>
                  <span className={cn(
                    'text-[13px] ml-1',
                    plan.highlight ? 'text-slate-500' : 'text-slate-400',
                  )}>
                    {plan.period}
                  </span>
                </div>
                <p className={cn(
                  'text-[11.5px] mb-7',
                  plan.highlight ? 'text-slate-600' : 'text-slate-400',
                )}>
                  {plan.yearlyNote}
                </p>

                {/* Limits */}
                <div className={cn(
                  'flex flex-col gap-1.5 mb-7 pb-7 border-b',
                  plan.highlight ? 'border-white/10' : 'border-slate-100',
                )}>
                  <div className="flex items-center gap-2 text-[13px]">
                    <Check className={cn('w-4 h-4 flex-shrink-0', plan.highlight ? 'text-indigo-400' : 'text-indigo-500')} />
                    <span className={plan.highlight ? 'text-slate-300' : 'text-slate-600'}>{plan.brands}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[13px]">
                    <Check className={cn('w-4 h-4 flex-shrink-0', plan.highlight ? 'text-indigo-400' : 'text-indigo-500')} />
                    <span className={plan.highlight ? 'text-slate-300' : 'text-slate-600'}>{plan.posts}</span>
                  </div>
                </div>

                {/* CTA */}
                <button
                  onClick={() => handleCheckout(plan.id)}
                  disabled={!!loadingPlan}
                  className={cn(
                    'mt-auto w-full h-11 rounded-xl text-[14px] font-semibold',
                    'flex items-center justify-center gap-2',
                    'transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed',
                    plan.highlight
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_4px_16px_rgba(99,102,241,0.35)]'
                      : 'bg-[#18181B] hover:bg-[#27272A] text-white',
                  )}
                >
                  {isLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Aguarde...</>
                    : plan.cta
                  }
                </button>
              </div>
            )
          })}
        </div>

        {/* Feature matrix */}
        <div className="bg-white rounded-2xl ring-1 ring-slate-200/80 overflow-hidden shadow-sm">
          {/* Header row */}
          <div className="grid grid-cols-4 border-b border-slate-100">
            <div className="p-5 text-[12px] font-bold uppercase tracking-[0.1em] text-slate-400">
              Recursos
            </div>
            {plans.map((p) => (
              <div key={p.id} className={cn(
                'p-5 text-center text-[12.5px] font-bold',
                p.highlight ? 'text-indigo-600' : 'text-slate-700',
              )}>
                {p.name}
              </div>
            ))}
          </div>

          {/* Feature rows */}
          {featureMatrix.map((row, i) => (
            <div
              key={row.label}
              className={cn(
                'grid grid-cols-4',
                i < featureMatrix.length - 1 && 'border-b border-slate-50',
              )}
            >
              <div className="p-4 px-5 text-[13px] text-slate-600 flex items-center">
                {row.label}
              </div>
              {([row.starter, row.pro, row.premium] as boolean[]).map((has, j) => (
                <div key={j} className="p-4 flex items-center justify-center">
                  {has
                    ? <Check className="w-4 h-4 text-indigo-500" />
                    : <X className="w-4 h-4 text-slate-200" />
                  }
                </div>
              ))}
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
