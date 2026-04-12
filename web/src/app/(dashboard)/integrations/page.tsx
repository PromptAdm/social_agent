'use client'

import { useState } from 'react'
import { CheckCircle2, Circle, ExternalLink, RefreshCw, Zap, Webhook } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'

interface Integration {
  id: string
  name: string
  description: string
  category: string
  status: 'connected' | 'disconnected'
  lastSync?: string
  webhooks?: number
  icon: React.ReactNode
}

const META_ICON = (
  <svg viewBox="0 0 32 32" className="w-7 h-7" fill="none">
    <rect width="32" height="32" rx="8" fill="#1877F2" />
    <path d="M17.5 10c-3.6 0-6 2.4-6 6.3V18h-2v3h2v7h3.5v-7h2.5l.5-3h-3v-1.6c0-.9.4-1.4 1.5-1.4H18V10h-.5z" fill="white"/>
  </svg>
)

const N8N_ICON = (
  <div className="w-7 h-7 rounded-lg bg-[#EA4B71] flex items-center justify-center">
    <Zap className="w-4 h-4 text-white" />
  </div>
)

const INSTAGRAM_ICON = (
  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center">
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  </div>
)

const integrations: Integration[] = [
  {
    id: 'meta',
    name: 'Meta / Facebook',
    description: 'Conecte sua conta Meta para publicar no Instagram e Facebook, receber webhooks de comentários e mensagens.',
    category: 'Redes Sociais',
    status: 'connected',
    lastSync: '5 min atrás',
    webhooks: 2,
    icon: META_ICON,
  },
  {
    id: 'instagram',
    name: 'Instagram Graph API',
    description: 'Acesse métricas detalhadas, comentários e publicações via API oficial do Instagram.',
    category: 'Redes Sociais',
    status: 'connected',
    lastSync: '5 min atrás',
    icon: INSTAGRAM_ICON,
  },
  {
    id: 'n8n',
    name: 'n8n Automation',
    description: 'Automatize publicações e workflows com seu servidor n8n. Integração por webhook bidirecional.',
    category: 'Automação',
    status: 'disconnected',
    icon: N8N_ICON,
  },
]

export default function IntegrationsPage() {
  const [refreshing, setRefreshing] = useState<string | null>(null)

  async function handleRefresh(id: string) {
    setRefreshing(id)
    await new Promise((r) => setTimeout(r, 1200))
    setRefreshing(null)
  }

  const connected = integrations.filter((i) => i.status === 'connected')
  const disconnected = integrations.filter((i) => i.status === 'disconnected')

  return (
    <div className="p-8 max-w-[900px] space-y-8">
      <PageHeader
        title="Integrações"
        subtitle="Conecte ferramentas externas para automatizar sua operação."
      />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-900/40 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-100">{connected.length}</p>
            <p className="text-xs text-slate-500">Conectadas</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#17171F] border border-[#27273A] flex items-center justify-center">
            <Circle className="w-4 h-4 text-slate-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-100">{disconnected.length}</p>
            <p className="text-xs text-slate-500">Disponíveis</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-950/60 border border-indigo-900/40 flex items-center justify-center">
            <Webhook className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-100">
              {integrations.reduce((sum, i) => sum + (i.webhooks ?? 0), 0)}
            </p>
            <p className="text-xs text-slate-500">Webhooks ativos</p>
          </div>
        </div>
      </div>

      {/* Connected */}
      {connected.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-600 mb-3">
            Conectadas
          </h2>
          <div className="space-y-3">
            {connected.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                refreshing={refreshing === integration.id}
                onRefresh={() => handleRefresh(integration.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Available */}
      {disconnected.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-600 mb-3">
            Disponíveis
          </h2>
          <div className="space-y-3">
            {disconnected.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                refreshing={false}
                onRefresh={() => {}}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function IntegrationCard({
  integration,
  refreshing,
  onRefresh,
}: {
  integration: Integration
  refreshing: boolean
  onRefresh: () => void
}) {
  const isConnected = integration.status === 'connected'

  return (
    <div className={`card p-5 flex items-start gap-4 hover:border-[#3F3F56] transition-colors ${
      isConnected ? '' : 'opacity-80'
    }`}>
      <div className="flex-shrink-0 mt-0.5">{integration.icon}</div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5 mb-1">
          <h3 className="text-sm font-semibold text-slate-100">{integration.name}</h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#17171F] border border-[#27273A] text-slate-600">
            {integration.category}
          </span>
          {isConnected ? (
            <span className="flex items-center gap-1 text-[11px] text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Conectado
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
              Não conectado
            </span>
          )}
        </div>

        <p className="text-sm text-slate-500 leading-relaxed">{integration.description}</p>

        {isConnected && (
          <div className="flex items-center gap-4 mt-2">
            {integration.lastSync && (
              <span className="text-[11px] text-slate-600">
                Última sync: {integration.lastSync}
              </span>
            )}
            {integration.webhooks !== undefined && (
              <span className="text-[11px] text-slate-600">
                {integration.webhooks} webhook{integration.webhooks !== 1 ? 's' : ''} ativo{integration.webhooks !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {isConnected ? (
          <>
            <button
              onClick={onRefresh}
              className="w-8 h-8 flex items-center justify-center rounded-md border border-[#27273A] hover:bg-[#17171F] text-slate-500 hover:text-slate-300 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5">
              <ExternalLink className="w-3 h-3" />
              Configurar
            </button>
          </>
        ) : (
          <button className="btn-primary text-xs px-3 py-1.5">
            Conectar
          </button>
        )}
      </div>
    </div>
  )
}
