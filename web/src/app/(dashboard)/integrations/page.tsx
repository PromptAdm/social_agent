'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AlertCircle, CheckCircle2, Loader2, Webhook, Zap } from 'lucide-react'
import { PageHeader }     from '@/components/shared/PageHeader'
import { IntegrationHub } from '@/components/integrations/IntegrationHub'
import { ProviderCard }   from '@/components/integrations/ProviderCard'
import {
  useIntegrationStatus,
  useConnectProvider,
  useDisconnectAccount,
} from '@/hooks/useIntegrations'
import { PROVIDER_META } from '@/types/integrations'
import type { Provider } from '@/types/integrations'

// Provider display order
const PROVIDERS: Provider[] = ['instagram', 'facebook', 'whatsapp', 'twitter']

export default function IntegrationsPage() {
  const searchParams = useSearchParams()
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Read OAuth return params on mount
  useEffect(() => {
    const connected  = searchParams.get('connected')
    const account    = searchParams.get('account')
    const oauthError = searchParams.get('oauth_error')

    console.log('[integrations] OAuth return params:', {
      connected,
      account,
      oauth_error: oauthError,
      full_search: window.location.search,
    })

    if (connected) {
      const names = connected.split(',').map(p => PROVIDER_META[p as Provider]?.label ?? p)
      setToast({
        type:    'success',
        message: `${names.join(' e ')} conectado${names.length > 1 ? 's' : ''} com sucesso${account ? ` — ${account}` : ''}!`,
      })
      // Clean the URL without refresh
      window.history.replaceState({}, '', '/integrations')
    } else if (oauthError) {
      console.error('[integrations] OAuth error received:', oauthError)
      setToast({ type: 'error', message: `Erro ao conectar: ${decodeURIComponent(oauthError)}` })
      window.history.replaceState({}, '', '/integrations')
    }
  }, [searchParams])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

  const { data: statusData, isLoading: statusLoading } = useIntegrationStatus()
  const connectMutation    = useConnectProvider()
  const disconnectMutation = useDisconnectAccount()

  // Map provider → status object from API
  const statusByProvider = Object.fromEntries(
    (statusData?.providers ?? []).map(p => [p.provider, p])
  )

  const connectedProviders = PROVIDERS.filter(p => statusByProvider[p]?.connected)

  // Map to hub IDs for the visual honeycomb
  const connectedHubIds = connectedProviders.flatMap(p =>
    p === 'facebook' ? ['facebook'] : [p]
  )

  const connectedCount = connectedProviders.length
  const totalWebhooks  = 0 // wired in phase 2

  return (
    <div className="p-8 max-w-[900px] space-y-8">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-500" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
          )}
          {toast.message}
        </div>
      )}

      <PageHeader
        title="Integrações"
        subtitle="Conecte suas redes sociais para publicar e automatizar sua operação."
      />

      {/* Visual honeycomb hub */}
      <IntegrationHub connectedIds={connectedHubIds} />

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">
              {statusLoading ? '–' : connectedCount}
            </p>
            <p className="text-xs text-slate-500">Conectadas</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
            <Zap className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">
              {statusLoading ? '–' : PROVIDERS.length - connectedCount}
            </p>
            <p className="text-xs text-slate-500">Disponíveis</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
            <Webhook className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">{totalWebhooks}</p>
            <p className="text-xs text-slate-500">Webhooks ativos</p>
          </div>
        </div>
      </div>

      {/* Provider list */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
          Providers
        </h2>

        {statusLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Carregando status…</span>
          </div>
        ) : (
          <div className="space-y-3">
            {PROVIDERS.map(provider => (
              <ProviderCard
                key={provider}
                meta={PROVIDER_META[provider]}
                status={statusByProvider[provider]}
                isLoading={false}
                onConnect={p => connectMutation.mutate(p)}
                onDisconnect={id => disconnectMutation.mutate(id)}
                isConnecting={connectMutation.isPending && connectMutation.variables === provider}
                isDisconnecting={disconnectMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
