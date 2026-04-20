'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  X,
  Zap,
  ExternalLink,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Settings,
  Sparkles,
  Lock,
} from 'lucide-react'
import { usePlan, usePlans } from '@/hooks/usePlan'
import { UsageMeter }  from '@/components/billing/UsageMeter'
import { PlanBadge }   from '@/components/billing/PlanBadge'
import { billingService } from '@/services/billingService'
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

const STATUS_LABEL: Record<string, string> = {
  free:      'Gratuito',
  active:    'Ativo',
  trialing:  'Trial',
  past_due:  'Pagamento pendente',
  cancelled: 'Cancelado',
  expired:   'Expirado',
}

const STATUS_COLOR: Record<string, string> = {
  free:      'text-slate-400 bg-slate-400/10 border-slate-400/20',
  active:    'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  trialing:  'text-blue-400 bg-blue-400/10 border-blue-400/20',
  past_due:  'text-amber-400 bg-amber-400/10 border-amber-400/20',
  cancelled: 'text-red-400 bg-red-400/10 border-red-400/20',
  expired:   'text-slate-400 bg-slate-400/10 border-slate-400/20',
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

// ── Feature row ───────────────────────────────────────────────────────────────

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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const searchParams  = useSearchParams()
  const queryClient   = useQueryClient()
  const [toast, setToast] = useState<Toast | null>(null)
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null)

  // Handle Stripe redirect-back params
  useEffect(() => {
    const success  = searchParams.get('success')
    const canceled = searchParams.get('canceled')

    if (success === 'true') {
      setToast({ type: 'success', message: 'Plano ativado com sucesso!' })
      queryClient.invalidateQueries({ queryKey: queryKeys.billing() })
      queryClient.invalidateQueries({ queryKey: queryKeys.billingPlans() })
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
      const msg = err instanceof Error ? err.message : 'Erro ao iniciar pagamento. Tente novamente.'
      setToast({ type: 'error', message: msg })
      setUpgradingPlan(null)
    },
  })

  const portalMutation = useMutation({
    mutationFn: billingService.createPortalSession,
    onSuccess: (data) => {
      window.location.href = data.portal_url
    },
    onError: () => {
      setToast({ type: 'error', message: 'Erro ao abrir portal de faturamento.' })
    },
  })

  const trialMutation = useMutation({
    mutationFn: billingService.startTrial,
    onSuccess: () => {
      setToast({ type: 'success', message: 'Trial ativado! Você tem 7 dias no plano Professional.' })
      queryClient.invalidateQueries({ queryKey: queryKeys.billing() })
      queryClient.invalidateQueries({ queryKey: queryKeys.billingPlans() })
    },
    onError: () => {
      setToast({ type: 'error', message: 'Não foi possível ativar o trial. Tente novamente.' })
    },
  })

  function handleUpgrade(planCode: string) {
    setUpgradingPlan(planCode)
    checkoutMutation.mutate(planCode)
  }

  const { data: summary, isLoading: summaryLoading } = usePlan()
  const { data: plans,   isLoading: plansLoading   } = usePlans()

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
  const effectivePlanName = plans?.find(p => p.code === effectivePlanCode)?.display_name ?? summary.plan_name

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

      {/* Current plan card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">

          <div>
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-2">
              Plano atual
            </p>
            <div className="flex items-center gap-2.5">
              <span className="text-[22px] font-bold text-slate-900">{effectivePlanName}</span>
              <PlanBadge plan={effectivePlanCode} />
            </div>

            <div className="flex items-center gap-2 mt-2">
              <span className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border',
                STATUS_COLOR[summary.status] ?? STATUS_COLOR.active,
              )}>
                {STATUS_LABEL[summary.status] ?? summary.status}
              </span>
              {summary.billing_cycle === 'yearly' && (
                <span className="text-[11px] text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full font-medium">
                  Anual
                </span>
              )}
              {summary.is_trial_active && trialDaysLeft !== null && (
                <span className="text-[11px] text-blue-500 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                  Trial · {trialDaysLeft}d restantes
                </span>
              )}
            </div>

            {summary.is_trial_active && summary.trial_ends_at && (
              <p className="text-[12px] text-slate-500 mt-2">
                Trial até{' '}
                <span className="font-medium text-blue-500">
                  {new Date(summary.trial_ends_at).toLocaleDateString('pt-BR')}
                </span>
              </p>
            )}
            {!summary.is_trial_active && summary.current_period_end && (
              <p className="text-[12px] text-slate-500 mt-2">
                {summary.cancel_at_period_end ? 'Cancela em' : 'Renova em'}{' '}
                <span className="font-medium text-slate-700">
                  {new Date(summary.current_period_end).toLocaleDateString('pt-BR')}
                </span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {summary.stripe_enabled && (summary.status === 'active' || summary.status === 'trialing') && (
              <button
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-[12px] text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-60"
              >
                {portalMutation.isPending
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Settings className="w-3.5 h-3.5" />
                }
                Gerenciar assinatura
              </button>
            )}
            <div className="w-12 h-12 bg-indigo-600/15 border border-indigo-500/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-indigo-400" />
            </div>
          </div>
        </div>

        {/* Usage meters */}
        <div className="mt-6 pt-5 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UsageMeter
            label="Marcas criadas"
            used={summary.usage.brands}
            limit={summary.limits.brands}
          />
          <UsageMeter
            label="Posts este mês"
            used={summary.usage.posts_per_month}
            limit={summary.limits.posts_per_month}
          />
        </div>

        {summary.cancel_at_period_end && summary.status === 'active' && (
          <div className="mt-4 flex items-center gap-2 text-[12px] text-orange-600 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            Assinatura cancelada — acesso mantido até{' '}
            {summary.current_period_end
              ? new Date(summary.current_period_end).toLocaleDateString('pt-BR')
              : 'o fim do período'}.
          </div>
        )}
        {summary.status === 'past_due' && (
          <div className="mt-4 flex items-center gap-2 text-[12px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            Pagamento pendente. Atualize seu método de pagamento para evitar interrupção do serviço.
          </div>
        )}
        {!summary.monetization_enabled && (
          <div className="mt-4 flex items-center gap-2 text-[12px] text-amber-400/80 bg-amber-400/5 border border-amber-400/15 rounded-lg px-3 py-2">
            <Zap className="w-3.5 h-3.5 flex-shrink-0" />
            Limites não estão sendo aplicados — modo preview ativo.
          </div>
        )}
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
