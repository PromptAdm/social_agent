'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/api/queryClient'
import { billingService } from '@/services/billingService'
import type { PlanFeatures, PlanLimits } from '@/types'

// ── Hooks principais ──────────────────────────────────────────────────────────

/** Resumo completo: plano + uso + limites + features */
export function usePlan() {
  return useQuery({
    queryKey: queryKeys.billing(),
    queryFn:  billingService.summary,
    staleTime: 5 * 60 * 1000,  // 5 min — plano muda raramente
    retry: false,               // não spam na API se billing offline
  })
}

/** Lista os planos públicos com preços e features */
export function usePlans() {
  return useQuery({
    queryKey: queryKeys.billingPlans(),
    queryFn:  billingService.plans,
    staleTime: 10 * 60 * 1000, // 10 min — planos mudam ainda menos
    retry: false,
  })
}

/** Só o uso atual (polling mais leve) */
export function usePlanUsage() {
  return useQuery({
    queryKey: queryKeys.billingUsage(),
    queryFn:  billingService.usage,
    staleTime: 60 * 1000,      // 1 min — uso muda mais frequentemente
    retry: false,
  })
}

// ── Helpers derivados ─────────────────────────────────────────────────────────

/** true se o usuário atingiu o limite de um recurso E monetização está ativa */
export function useIsAtLimit(resource: keyof PlanLimits): boolean {
  const { data } = usePlan()
  if (!data || !data.monetization_enabled) return false
  const limit = data.limits[resource]
  if (limit === -1) return false
  return data.usage[resource] >= limit
}

/** Percentual de uso de um recurso (0–100). 0 quando ilimitado. */
export function useLimitPercent(resource: keyof PlanLimits): number {
  const { data } = usePlan()
  if (!data) return 0
  const limit = data.limits[resource]
  if (limit === -1) return 0
  return Math.min(100, Math.round((data.usage[resource] / limit) * 100))
}

/** true quando uso >= threshold% (padrão 80%) */
export function useIsNearLimit(resource: keyof PlanLimits, threshold = 80): boolean {
  return useLimitPercent(resource) >= threshold
}

/** true se o plano do usuário inclui a feature */
export function useHasFeature(feature: keyof PlanFeatures): boolean {
  const { data } = usePlan()
  if (!data) return true  // otimista enquanto carrega
  return data.features[feature]
}
