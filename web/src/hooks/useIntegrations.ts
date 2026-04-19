'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { integrationService } from '@/services/integrationService'
import type { Provider } from '@/types/integrations'

const KEYS = {
  status:   (brandId?: number) => ['integrations', 'status',   brandId] as const,
  accounts: (brandId?: number) => ['integrations', 'accounts', brandId] as const,
}

export function useIntegrationStatus(brandId?: number) {
  return useQuery({
    queryKey:  KEYS.status(brandId),
    queryFn:   () => integrationService.getStatus(brandId),
    staleTime: 30_000,
    retry:     1,
  })
}

export function useConnectedAccounts(brandId?: number) {
  return useQuery({
    queryKey:  KEYS.accounts(brandId),
    queryFn:   () => integrationService.listAccounts(brandId),
    staleTime: 30_000,
    retry:     1,
  })
}

export function useConnectProvider(brandId?: number) {
  return useMutation({
    mutationFn: async (provider: Provider) => {
      const { redirect_url } = await integrationService.getConnectUrl(provider, brandId)
      // Redirect the browser to the OAuth provider
      window.location.href = redirect_url
    },
  })
}

export function useDisconnectAccount(brandId?: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (accountId: number) => integrationService.disconnect(accountId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrations'] })
    },
  })
}
