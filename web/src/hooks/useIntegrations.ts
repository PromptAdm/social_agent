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
      console.log('[useConnectProvider] provider clicked:', provider, '| brandId:', brandId)

      const data = await integrationService.getConnectUrl(provider, brandId)
      console.log('[useConnectProvider] API response:', data)
      console.log('[useConnectProvider] redirect_url:', data.redirect_url)

      window.location.href = data.redirect_url
    },
    onError: (error: unknown) => {
      const raw = error instanceof Error ? error.message : String(error)
      console.error('[useConnectProvider] failed — raw error:', raw)

      // FastAPI retorna {"detail":"Not Found"} quando a rota não existe no servidor.
      // Isso indica problema de deploy: o backend não tem o endpoint /integrations/connect/{provider}.
      const message =
        raw === 'Not Found'
          ? 'Endpoint não encontrado no servidor. Verifique se o backend está atualizado e redeploy se necessário.'
          : raw

      alert(`Erro ao iniciar conexão: ${message}`)
    },
  })
}

export function useMetaStatus() {
  return useQuery({
    queryKey:  ['integrations', 'meta', 'status'],
    queryFn:   () => integrationService.getMetaStatus(),
    staleTime: 30_000,
    retry:     1,
  })
}

export function useConnectMeta() {
  return useMutation({
    mutationFn: async () => {
      const data = await integrationService.getMetaConnectUrl()
      window.location.href = data.redirect_url
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : String(error)
      alert(`Erro ao iniciar conexão Meta: ${msg}`)
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
