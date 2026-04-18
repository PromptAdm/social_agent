'use client'

import { Check, X, Zap, ExternalLink, TrendingUp } from 'lucide-react'
import { usePlan, usePlans } from '@/hooks/usePlan'
import { UsageMeter }  from '@/components/billing/UsageMeter'
import { PlanBadge }   from '@/components/billing/PlanBadge'
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
  active:    'Ativo',
  trialing:  'Trial',
  past_due:  'Pagamento pendente',
  cancelled: 'Cancelado',
}

const STATUS_COLOR: Record<string, string> = {
  active:    'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  trialing:  'text-blue-400 bg-blue-400/10 border-blue-400/20',
  past_due:  'text-amber-400 bg-amber-400/10 border-amber-400/20',
  cancelled: 'text-red-400 bg-red-400/10 border-red-400/20',
}

// ── Componente de feature row ──────────────────────────────────────────────────

function FeatureRow({ label, included }: { label: string; included: boolean }) {
  return (
    <li className="flex items-center gap-2 text-[13px]">
      {included
        ? <Check className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
        : <X     className="w-3.5 h-3.5 text-slate-700 flex-shrink-0" />
      }
      <span className={included ? 'text-slate-600' : 'text-slate-600'}>
        {label}
      </span>
    </li>
  )
}

// ── Plano card ─────────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  stripeEnabled,
  currentPlanCode,
}: {
  plan: PlanDetail
  stripeEnabled: boolean
  currentPlanCode: PlanCode
}) {
  const isPro      = plan.code === 'professional'
  const isCurrent  = plan.is_current
  const isUpgrade  = !isCurrent  // simplified — all non-current are "upgrade"

  const PLAN_ORDER: PlanCode[] = ['starter', 'professional', 'premium']
  const currentIdx  = PLAN_ORDER.indexOf(currentPlanCode as PlanCode) ?? 0
  const planIdx     = PLAN_ORDER.indexOf(plan.code as PlanCode)
  const isDowngrade = planIdx < currentIdx

  function handleCTA() {
    if (!stripeEnabled) {
      alert('Upgrade em breve! Entre em contato para mais informações.')
      return
    }
    // TODO: redirecionar para checkout Stripe
  }

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-xl border p-6 transition-all',
        isPro
          ? 'bg-indigo-600/8 border-indigo-500/30 ring-1 ring-indigo-500/20'
          : 'bg-white border-slate-200',
      )}
    >
      {/* Popular badge */}
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
        <FeatureRow label="Agendamento de posts"   included={plan.features.scheduling} />
        <FeatureRow label="Analytics avançado"     included={plan.features.analytics} />
        <FeatureRow label="Fluxo de aprovação"     included={plan.features.approval} />
        <FeatureRow label="Suporte prioritário"    included={plan.features.priority_support} />
      </ul>

      {/* CTA */}
      {isCurrent ? (
        <div className="h-9 flex items-center justify-center rounded-lg border border-slate-200 text-[13px] text-slate-500">
          Plano atual
        </div>
      ) : isDowngrade ? (
        <button
          disabled
          className="h-9 rounded-lg border border-slate-200 text-[13px] text-slate-600 cursor-not-allowed"
        >
          Fazer downgrade
        </button>
      ) : (
        <button
          onClick={handleCTA}
          className={cn(
            'h-9 rounded-lg text-[13px] font-semibold transition-all flex items-center justify-center gap-1.5',
            isPro
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200',
          )}
        >
          {stripeEnabled ? (
            <>Fazer upgrade <ExternalLink className="w-3.5 h-3.5" /></>
          ) : (
            <>Fazer upgrade <span className="text-[10px] opacity-60">(em breve)</span></>
          )}
        </button>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function BillingPage() {
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

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto space-y-8">

      {/* ── Cabeçalho ── */}
      <div>
        <h1 className="text-[20px] font-semibold text-slate-900">Plano & Faturamento</h1>
        <p className="text-[13px] text-slate-500 mt-1">
          Gerencie seu plano, acompanhe seu uso e faça upgrade quando precisar.
        </p>
      </div>

      {/* ── Card do plano atual ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">

          {/* Info do plano */}
          <div>
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-2">
              Plano atual
            </p>
            <div className="flex items-center gap-2.5">
              <span className="text-[22px] font-bold text-slate-900">{summary.plan_name}</span>
              <PlanBadge plan={summary.plan_code} />
            </div>

            {/* Status */}
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
            </div>

            {/* Período */}
            {summary.current_period_end && (
              <p className="text-[12px] text-slate-500 mt-2">
                {summary.cancel_at_period_end ? 'Cancela em' : 'Renova em'}{' '}
                {new Date(summary.current_period_end).toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>

          {/* Ícone */}
          <div className="w-12 h-12 bg-indigo-600/15 border border-indigo-500/20 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-indigo-400" />
          </div>
        </div>

        {/* Uso atual */}
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

        {/* Aviso quando monetização está desabilitada */}
        {!summary.monetization_enabled && (
          <div className="mt-4 flex items-center gap-2 text-[12px] text-amber-400/80 bg-amber-400/5 border border-amber-400/15 rounded-lg px-3 py-2">
            <Zap className="w-3.5 h-3.5 flex-shrink-0" />
            Limites não estão sendo aplicados — modo preview ativo.
          </div>
        )}
      </div>

      {/* ── Comparação de planos ── */}
      <div>
        <h2 className="text-[15px] font-semibold text-slate-700 mb-1">Planos disponíveis</h2>
        <p className="text-[13px] text-slate-500 mb-5">
          Compare os planos e escolha o ideal para o seu negócio.
        </p>

        {plans && plans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <PlanCard
                key={plan.code}
                plan={plan}
                stripeEnabled={summary.stripe_enabled}
                currentPlanCode={summary.plan_code}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500 text-[13px]">
            Planos não disponíveis no momento.
          </div>
        )}
      </div>

      {/* ── Rodapé ── */}
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
