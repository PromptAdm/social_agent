'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/api/queryClient'
import { billingService } from '@/services/billingService'
import type { PlanLimits } from '@/types'

/**
 * usePlan — hook principal para dados de billing/plano.
 *
 * - staleTime: 5 min (plano muda raramente)
 * - retry: false (evita spam na API se billing estiver fora)
 * - Falha silenciosa: quando dados não carregam, helpers retornam "seguro"
 *   (sem bloquear UI, sem exibir erros)
 */
export function usePlan() {
  return useQuery({
    queryKey: queryKeys.billing(),
    queryFn:  billingService.summary,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}

// ── Helpers derivados ─────────────────────────────────────────────────────────

/**
 * Retorna true se o usuário atingiu o limite de um recurso.
 * Retorna false quando monetization_enabled=false ou dados não carregados.
 */
export function useIsAtLimit(resource: keyof PlanLimits): boolean {
  const { data } = usePlan()
  if (!data || !data.monetization_enabled) return false
  const limit = data.limits[resource]
  if (limit === -1) return false
  return data.usage[resource] >= limit
}

/**
 * Percentual de uso de um recurso (0-100).
 * Retorna 0 quando ilimitado ou dados não carregados.
 */
export function useLimitPercent(resource: keyof PlanLimits): number {
  const { data } = usePlan()
  if (!data) return 0
  const limit = data.limits[resource]
  if (limit === -1) return 0
  return Math.min(100, Math.round((data.usage[resource] / limit) * 100))
}

/**
 * true quando o uso está acima do limiar de aviso (padrão: 80%).
 */
export function useIsNearLimit(resource: keyof PlanLimits, threshold = 80): boolean {
  return useLimitPercent(resource) >= threshold
}
