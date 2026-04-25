'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  X,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Settings,
  Sparkles,
  Lock,
} from 'lucide-react'
import { usePlan, usePlans, useCredits } from '@/hooks/usePlan'
import { PlanBadge }   from '@/components/billing/PlanBadge'
import { billingService, type CreditsCheckoutRequest } from '@/services/billingService'
import { queryKeys }   from '@/lib/api/queryClient'
import { cn }          from '@/lib/utils/cn'
import type { PlanDetail, PlanCode } from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCents(cents: number): string {
  if (cents === 0) return 'Grátis'
  return new Intl.NumberFormat('pt-BR', {
    style:    'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

function formatLimit(n: number, singular: string, plural: string): string {
  if (n === -1) return `${singular === 'marca' ? 'Marcas' : 'Posts'} ilimitados`
  return `${n} ${n === 1 ? singular : plural}`
}

// ── Toast ─────────────────────────────────────────────────────────────────────

type Toast = { type: 'success' | 'error'; message: string }

function ToastBanner({ toast }: { toast: Toast }) {
  return (
    <div
      className={cn(
        'fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium transition-all',
        toast.type === 'success'
          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
          : 'bg-red-50 border-red-200 text-red-700',
      )}
    >
      {toast.type === 'success'
        ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-500" />
        : <AlertCircle  className="w-4 h-4 flex-shrink-0 text-red-500" />
      }
      {toast.message}
    </div>
  )
}

// ── Feature row (used by PlanCard) ───────────────────────────────────────────

function FeatureRow({ label, included }: { label: string; included: boolean }) {
  return (
    <li className="flex items-center gap-2 text-[13px]">
      {included
        ? <Check className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
        : <X     className="w-3.5 h-3.5 text-slate-700 flex-shrink-0" />
      }
      <span className="text-slate-600">{label}</span>
    </li>
  )
}

// ── Subscribed plan card ──────────────────────────────────────────────────────

const PLAN_BENEFITS: Record<string, string[]> = {
  starter:      ['1 marca', '100 posts/mês', 'Agendamento de posts'],
  professional: ['5 marcas', '500 posts/mês', 'Agendamento de posts', 'Analytics avançado', 'Fluxo de aprovação'],
  premium:      ['Marcas ilimitadas', 'Posts ilimitados', 'Todos os recursos', 'Suporte prioritário'],
}

function SubscribedPlanCard({
  planCode,
  planName,
  stripeEnabled,
  status,
  onManage,
  isManaging,
}: {
  planCode: string
  planName: string
  stripeEnabled: boolean
  status: string
  onManage: () => void
  isManaging: boolean
}) {
  const isKnown   = ['starter', 'professional', 'premium'].includes(planCode)
  const benefits  = PLAN_BENEFITS[planCode] ?? []
  const showPortal = stripeEnabled && (status === 'active' || status === 'trialing' || status === 'past_due')

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-2">
            Seu plano contratado
          </p>
          <h2 className="text-[18px] font-bold text-slate-900">
            {isKnown ? planName : 'Assinatura gerenciada pela Stripe'}
          </h2>
          <p className="text-[13px] text-slate-500 mt-2 max-w-md">
            Seu plano, forma de pagamento, histórico de cobrança e cancelamento são
            gerenciados com segurança pelo portal da Stripe.
          </p>
        </div>

        {showPortal && (
          <button
            onClick={onManage}
            disabled={isManaging}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-[12px] text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-60 flex-shrink-0"
          >
            {isManaging
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Settings className="w-3.5 h-3.5" />
            }
            Gerenciar assinatura
          </button>
        )}
      </div>

      {isKnown && benefits.length > 0 && (
        <div className="mt-5 pt-4 border-t border-slate-100">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Incluído no seu plano
          </p>
          <ul className="grid grid-cols-2 sm:grid-cols-4 gap-y-2 gap-x-4">
            {benefits.map((b) => (
              <li key={b} className="flex items-center gap-2 text-[13px] text-slate-600">
                <Check className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                {b}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ── Plan card ─────────────────────────────────────────────────────────────────

const PLAN_ORDER: PlanCode[] = ['starter', 'professional', 'premium']

function PlanCard({
  plan,
  stripeEnabled,
  currentPlanCode,
  onUpgrade,
  isUpgrading,
}: {
  plan: PlanDetail
  stripeEnabled: boolean
  currentPlanCode: string
  onUpgrade: (planCode: string) => void
  isUpgrading: boolean
}) {
  const isPro       = plan.code === 'professional'
  const isCurrent   = plan.is_current
  const currentIdx  = PLAN_ORDER.indexOf(currentPlanCode as PlanCode) ?? 0
  const planIdx     = PLAN_ORDER.indexOf(plan.code as PlanCode)
  const isDowngrade = planIdx < currentIdx

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-xl border p-6 transition-all',
        isPro
          ? 'bg-indigo-600/8 border-indigo-500/30 ring-1 ring-indigo-500/20'
          : 'bg-white border-slate-200',
      )}
    >
      {isPro && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-full">
            Popular
          </span>
        </div>
      )}

      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[15px] font-semibold text-slate-900">{plan.display_name}</h3>
          {isCurrent && <PlanBadge plan={plan.code} />}
        </div>
        <div className="flex items-baseline gap-1 mt-3">
          <span className="text-3xl font-bold text-slate-900">
            {formatCents(plan.price_monthly_cents)}
          </span>
          {plan.price_monthly_cents > 0 && (
            <span className="text-[13px] text-slate-500">/mês</span>
          )}
        </div>
        {plan.price_yearly_cents > 0 && (
          <p className="text-[11px] text-slate-500 mt-0.5">
            {formatCents(plan.price_yearly_cents)}/mês no plano anual
          </p>
        )}
      </div>

      {/* Limits */}
      <div className="mb-5 space-y-1.5">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Limites
        </p>
        <p className="text-[13px] text-slate-400">
          {formatLimit(plan.limits.brands, 'marca', 'marcas')}
        </p>
        <p className="text-[13px] text-slate-400">
          {formatLimit(plan.limits.posts_per_month, 'post/mês', 'posts/mês')}
        </p>
      </div>

      {/* Features */}
      <ul className="mb-6 space-y-2 flex-1">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Recursos
        </p>
        <FeatureRow label="Agendamento de posts" included={plan.features.scheduling} />
        <FeatureRow label="Analytics avançado"   included={plan.features.analytics} />
        <FeatureRow label="Fluxo de aprovação"   included={plan.features.approval} />
        <FeatureRow label="Suporte prioritário"  included={plan.features.priority_support} />
      </ul>

      {/* CTA */}
      {isCurrent ? (
        <button
          disabled
          aria-disabled
          className="h-9 flex items-center justify-center rounded-lg border border-slate-200 text-[13px] text-slate-400 cursor-not-allowed opacity-70 w-full"
        >
          Plano atual
        </button>
      ) : isDowngrade ? (
        <button
          disabled
          className="h-9 rounded-lg border border-slate-200 text-[13px] text-slate-600 cursor-not-allowed"
        >
          Fazer downgrade
        </button>
      ) : !stripeEnabled ? (
        <div className="flex flex-col items-center gap-1">
          <button
            disabled
            className="h-9 w-full rounded-lg border border-slate-200 text-[13px] text-slate-400 cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <Lock className="w-3 h-3" />
            Pagamentos em breve
          </button>
        </div>
      ) : (
        <button
          onClick={() => onUpgrade(plan.code)}
          disabled={isUpgrading}
          className={cn(
            'h-9 w-full rounded-lg text-[13px] font-semibold transition-all flex items-center justify-center gap-1.5',
            isPro
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-60'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 disabled:opacity-60',
          )}
        >
          {isUpgrading ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Aguarde…</>
          ) : (
            <>Fazer upgrade <ExternalLink className="w-3.5 h-3.5" /></>
          )}
        </button>
      )}
    </div>
  )
}

// ── Credits section ───────────────────────────────────────────────────────────

function CreditPackageCard({
  code,
  amount,
  price_brl_cents,
  label,
  badge,
  stripeEnabled,
  onBuy,
  isBuying,
}: {
  code:            string
  amount:          number
  price_brl_cents: number
  label:           string
  badge:           string | null
  stripeEnabled:   boolean
  onBuy:           (code: string) => void
  isBuying:        boolean
}) {
  const isPopular = code === 'credits_500'

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-xl border p-5 transition-all',
        isPopular
          ? 'bg-indigo-600/[0.06] border-indigo-500/30 ring-1 ring-indigo-500/20'
          : 'bg-white border-slate-200',
      )}
    >
      {badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-full whitespace-nowrap">
            {badge}
          </span>
        </div>
      )}

      <div className="mb-4">
        <p className="text-[22px] font-bold text-slate-900">{amount.toLocaleString('pt-BR')}</p>
        <p className="text-[13px] text-slate-500">créditos</p>
        <div className="flex items-baseline gap-1 mt-3">
          <span className="text-[20px] font-bold text-slate-900">
            {formatCents(price_brl_cents)}
          </span>
          <span className="text-[12px] text-slate-400">único</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-0.5">
          {formatCents(Math.round(price_brl_cents / amount * 100))} por crédito
        </p>
      </div>

      {!stripeEnabled ? (
        <button
          disabled
          className="mt-auto h-9 w-full rounded-lg border border-slate-200 text-[13px] text-slate-400 cursor-not-allowed flex items-center justify-center gap-1.5"
        >
          <Lock className="w-3 h-3" /> Em breve
        </button>
      ) : (
        <button
          onClick={() => onBuy(code)}
          disabled={isBuying}
          className={cn(
            'mt-auto h-9 w-full rounded-lg text-[13px] font-semibold transition-all flex items-center justify-center gap-1.5',
            isPopular
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-60'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 disabled:opacity-60',
          )}
        >
          {isBuying
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Aguarde…</>
            : 'Comprar'
          }
        </button>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const searchParams  = useSearchParams()
  const queryClient   = useQueryClient()
  const [toast, setToast] = useState<Toast | null>(null)
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null)
  const [buyingPackage, setBuyingPackage] = useState<string | null>(null)

  // Handle Stripe redirect-back params
  useEffect(() => {
    const success        = searchParams.get('success')
    const canceled       = searchParams.get('canceled')
    const creditsSuccess = searchParams.get('credits_success')

    if (success === 'true') {
      setToast({ type: 'success', message: 'Plano ativado com sucesso!' })
      queryClient.invalidateQueries({ queryKey: queryKeys.billing() })
      queryClient.invalidateQueries({ queryKey: queryKeys.billingPlans() })
      window.history.replaceState({}, '', '/billing')
    } else if (creditsSuccess === 'true') {
      setToast({ type: 'success', message: 'Créditos adicionados ao seu saldo!' })
      queryClient.invalidateQueries({ queryKey: queryKeys.creditBalance() })
      window.history.replaceState({}, '', '/billing')
    } else if (canceled === 'true') {
      window.history.replaceState({}, '', '/billing')
    }
  }, [searchParams, queryClient])

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

  const checkoutMutation = useMutation({
    mutationFn: (planCode: string) =>
      billingService.createCheckoutSession({ plan_code: planCode, billing_cycle: 'monthly' }),
    onSuccess: (data) => {
      window.location.href = data.checkout_url
    },
    onError: (err: unknown) => {
      // parseApiError no interceptor Axios rejeita com string — usar direto
      console.error('[billing] checkout error:', err)
      const msg = typeof err === 'string'
        ? err
        : (err instanceof Error ? err.message : 'Erro ao iniciar pagamento. Tente novamente.')
      setToast({ type: 'error', message: msg })
      setUpgradingPlan(null)
    },
  })

  const portalMutation = useMutation({
    mutationFn: billingService.createPortalSession,
    onSuccess: (data) => {
      window.location.href = data.portal_url
    },
    onError: (err: unknown) => {
      console.error('[billing] portal error:', err)
      const msg = typeof err === 'string'
        ? err
        : 'Erro ao abrir portal de faturamento.'
      setToast({ type: 'error', message: msg })
    },
  })

  const trialMutation = useMutation({
    mutationFn: billingService.startTrial,
    onSuccess: () => {
      setToast({ type: 'success', message: 'Trial ativado! Você tem 7 dias no plano Professional.' })
      queryClient.invalidateQueries({ queryKey: queryKeys.billing() })
      queryClient.invalidateQueries({ queryKey: queryKeys.billingPlans() })
    },
    onError: (err: unknown) => {
      console.error('[billing] trial error:', err)
      const msg = typeof err === 'string'
        ? err
        : 'Não foi possível ativar o trial. Tente novamente.'
      setToast({ type: 'error', message: msg })
    },
  })

  const creditsMutation = useMutation({
    mutationFn: (req: CreditsCheckoutRequest) => billingService.createCreditsCheckout(req),
    onSuccess: (data) => {
      window.location.href = data.checkout_url
    },
    onError: (err: unknown) => {
      const msg = typeof err === 'string' ? err : 'Erro ao iniciar compra de créditos.'
      setToast({ type: 'error', message: msg })
      setBuyingPackage(null)
    },
  })

  function handleBuyCredits(packageCode: string) {
    setBuyingPackage(packageCode)
    creditsMutation.mutate(
      { package_code: packageCode as CreditsCheckoutRequest['package_code'] },
      { onSettled: () => setBuyingPackage(null) },
    )
  }

  function handleUpgrade(planCode: string) {
    console.log('[billing] upgrade clicked:', planCode)
    setUpgradingPlan(planCode)
    checkoutMutation.mutate(planCode, {
      onSettled: () => setUpgradingPlan(null),
    })
  }

  const { data: summary, isLoading: summaryLoading } = usePlan()
  const { data: plans,   isLoading: plansLoading   } = usePlans()
  const { data: credits }                             = useCredits()

  if (summaryLoading || plansLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500 text-[14px]">Não foi possível carregar informações de billing.</p>
      </div>
    )
  }

  const trialDaysLeft = summary.trial_days_left ?? (
    summary.trial_ends_at
      ? Math.max(0, Math.ceil(
          (new Date(summary.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        ))
      : null
  )

  const effectivePlanCode = (summary.effective_plan_code ?? summary.plan_code) as PlanCode
  const isKnownPlan       = ['starter', 'professional', 'premium'].includes(effectivePlanCode)
  const effectivePlanName = plans?.find(p => p.code === effectivePlanCode)?.display_name
    ?? (isKnownPlan ? summary.plan_name : 'Assinatura ativa')

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto space-y-8">

      {toast && <ToastBanner toast={toast} />}

      {/* Header */}
      <div>
        <h1 className="text-[20px] font-semibold text-slate-900">Plano & Faturamento</h1>
        <p className="text-[13px] text-slate-500 mt-1">
          Gerencie seu plano, acompanhe seu uso e faça upgrade quando precisar.
        </p>
      </div>

      {/* Trial CTA — free user who hasn't used trial */}
      {summary.status === 'free' && !summary.has_used_trial && (
        <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600/15 border border-indigo-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-semibold text-slate-800">Experimente o plano Professional grátis por 7 dias</p>
            <p className="text-[12px] text-slate-500 mt-0.5">Sem cartão de crédito. Cancele quando quiser. Acesso total a todos os recursos.</p>
          </div>
          <button
            onClick={() => trialMutation.mutate()}
            disabled={trialMutation.isPending}
            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-[13px] font-semibold rounded-lg transition-colors"
          >
            {trialMutation.isPending ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Ativando…</>
            ) : (
              <><Sparkles className="w-3.5 h-3.5" /> Iniciar trial gratuito</>
            )}
          </button>
        </div>
      )}

      {/* Active trial status banner */}
      {summary.is_trial_active && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <Sparkles className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-blue-800">
              Trial ativo — Plano Professional
            </p>
            <p className="text-[12px] text-blue-600 mt-0.5">
              {summary.trial_days_left != null
                ? `Termina em ${summary.trial_days_left} dia${summary.trial_days_left === 1 ? '' : 's'}`
                : summary.trial_ends_at
                  ? `Termina em ${new Date(summary.trial_ends_at).toLocaleDateString('pt-BR')}`
                  : 'Trial em andamento'}
              {' '}· Para continuar, escolha um plano abaixo antes do fim do período.
            </p>
          </div>
        </div>
      )}

      {/* Subscribed plan card */}
      <SubscribedPlanCard
        planCode={effectivePlanCode}
        planName={effectivePlanName}
        stripeEnabled={summary.stripe_enabled}
        status={summary.status}
        onManage={() => portalMutation.mutate()}
        isManaging={portalMutation.isPending}
      />

      {/* Plan comparison */}
      <div>
        <h2 className="text-[15px] font-semibold text-slate-700 mb-1">Planos disponíveis</h2>
        <p className="text-[13px] text-slate-500 mb-5">
          Compare os planos e escolha o ideal para o seu negócio.
        </p>

        {!summary.stripe_enabled && (
          <div className="mb-4 flex items-center gap-2 text-[12px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
            <Lock className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
            Pagamentos ainda não estão disponíveis neste ambiente. Os planos estão em configuração.
          </div>
        )}

        {plans && plans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <PlanCard
                key={plan.code}
                plan={plan}
                stripeEnabled={summary.stripe_enabled}
                currentPlanCode={effectivePlanCode}
                onUpgrade={handleUpgrade}
                isUpgrading={checkoutMutation.isPending && upgradingPlan === plan.code}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500 text-[13px]">
            Planos não disponíveis no momento.
          </div>
        )}
      </div>

      {/* Credits section */}
      <div id="credits">
        <div className="flex items-start justify-between mb-1 flex-wrap gap-2">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-700">Comprar créditos</h2>
            <p className="text-[13px] text-slate-500 mt-0.5">
              Créditos permitem criar posts extras além do seu plano mensal.
            </p>
          </div>
          {credits !== undefined && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
              <span className="text-[13px] font-semibold text-indigo-700">
                {credits.balance.toLocaleString('pt-BR')} crédito{credits.balance === 1 ? '' : 's'}
              </span>
            </div>
          )}
        </div>

        {!summary?.stripe_enabled && (
          <div className="mb-4 flex items-center gap-2 text-[12px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 mt-4">
            <Lock className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
            Compra de créditos disponível em breve.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          {(credits?.packages ?? []).map((pkg) => (
            <CreditPackageCard
              key={pkg.code}
              {...pkg}
              stripeEnabled={summary?.stripe_enabled ?? false}
              onBuy={handleBuyCredits}
              isBuying={creditsMutation.isPending && buyingPackage === pkg.code}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <p className="text-[12px] text-slate-600 text-center pb-4">
        Precisa de ajuda?{' '}
        <a href="mailto:suporte@nezora.com.br" className="text-indigo-400 hover:text-indigo-300 transition-colors">
          Entre em contato
        </a>
        {' '}· Cancelamento a qualquer momento · Sem taxas ocultas
      </p>

    </div>
  )
}
