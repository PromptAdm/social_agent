'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/api/queryClient'
import { creditService } from '@/services/creditService'

export function useCredits() {
  return useQuery({
    queryKey: queryKeys.creditBalance(),
    queryFn:  creditService.balance,
    staleTime: 60 * 1000,   // 1 min — saldo muda após operações
    retry: false,
  })
}

export function useCreditLogs(offset = 0, limit = 50) {
  return useQuery({
    queryKey: queryKeys.creditLogs(offset),
    queryFn:  () => creditService.logs(limit, offset),
    staleTime: 30 * 1000,
    retry: false,
  })
}

/** Invalida o saldo em cache após qualquer operação que consuma/adicione créditos. */
export function useInvalidateCredits() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['credits'] })
}
