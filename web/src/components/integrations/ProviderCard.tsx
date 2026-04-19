'use client'

import { AlertCircle, CheckCircle2, ExternalLink, Loader2, RefreshCw, Unlink } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import type { Provider, ProviderMeta, ProviderStatus } from '@/types/integrations'

// ── Brand icons ────────────────────────────────────────────────────────────────

function IgIcon() {
  return (
    <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="8" fill="#C13584" />
      <rect x="10" y="10" width="12" height="12" rx="6" fill="none" stroke="white" strokeWidth="2.2" />
      <circle cx="22.5" cy="9.5" r="1.6" fill="white" />
    </svg>
  )
}

function FbIcon() {
  return (
    <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="8" fill="#1877F2" />
      <path d="M18 8h2.5V5H18C15.8 5 14 6.8 14 9.2V11h-2v3h2v10h3V14h2.5l.5-3H17V9.5c0-.8.4-1.5 1-1.5z" fill="white" />
    </svg>
  )
}

function WaIcon() {
  return (
    <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="8" fill="#25D366" />
      <path d="M16 5.5A10.5 10.5 0 005.5 16c0 1.9.5 3.7 1.4 5.2L5 27l6-1.9A10.5 10.5 0 1016 5.5zm5.9 14.7c-.3.7-1.4 1.4-2 1.5-.5.1-1.1.1-1.7-.1-1.2-.4-2.3-1-3.2-2-.8-.9-1.4-1.9-1.6-2.8-.2-.7 0-1.5.4-1.9l.4-.4c.1-.1.3-.2.4 0l1.2 1.7c.1.2 0 .4-.1.5l-.4.4c-.1.1-.1.3 0 .4.4.7.9 1.3 1.5 1.7.6.5 1.2.8 1.8 1 .2.1.4 0 .5-.1l.4-.5c.1-.2.4-.3.5-.1l1.7 1c.2.1.2.3.2.4l-.2.3z" fill="white" />
    </svg>
  )
}

function TwIcon() {
  return (
    <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="8" fill="#000000" />
      <path d="M23 7h3L18.5 15.2l8.5 11.8h-7L14.8 20l-5.7 7H6l8-9.5L6 7h7.2l4.3 5.8L23 7zm-1.2 17.2h1.8L11.2 8.8H9.3l12.5 15.4z" fill="white" />
    </svg>
  )
}

const ICONS: Record<Provider, React.ReactNode> = {
  instagram: <IgIcon />,
  facebook:  <FbIcon />,
  whatsapp:  <WaIcon />,
  twitter:   <TwIcon />,
}

// ── ProviderCard ──────────────────────────────────────────────────────────────

interface ProviderCardProps {
  meta:         ProviderMeta
  status:       ProviderStatus | undefined
  isLoading:    boolean
  onConnect:    (provider: Provider) => void
  onDisconnect: (accountId: number) => void
  isConnecting: boolean
  isDisconnecting: boolean
}

export function ProviderCard({
  meta,
  status,
  isLoading,
  onConnect,
  onDisconnect,
  isConnecting,
  isDisconnecting,
}: ProviderCardProps) {
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false)

  const connected = status?.connected ?? false
  const disabled  = !meta.enabled

  function handleDisconnect() {
    if (!confirmingDisconnect) {
      setConfirmingDisconnect(true)
      return
    }
    if (status?.account_id) {
      onDisconnect(status.account_id)
    }
    setConfirmingDisconnect(false)
  }

  return (
    <div
      className={cn(
        'card p-5 flex items-start gap-4 transition-colors',
        disabled   && 'opacity-60',
        !disabled  && 'hover:border-slate-300',
      )}
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        {ICONS[meta.id]}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5 mb-1 flex-wrap">
          <h3 className="text-sm font-semibold text-slate-900">{meta.label}</h3>

          {disabled ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500 font-medium">
              Em breve
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500">
              Fase {meta.phase}
            </span>
          )}

          {isLoading ? (
            <Loader2 className="w-3 h-3 text-slate-300 animate-spin" />
          ) : connected ? (
            <span className="flex items-center gap-1 text-[11px] text-emerald-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Conectado
            </span>
          ) : !disabled ? (
            <span className="flex items-center gap-1 text-[11px] text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              Não conectado
            </span>
          ) : null}
        </div>

        <p className="text-[13px] text-slate-500 leading-relaxed">{meta.description}</p>

        {/* Connected account info */}
        {connected && status?.account_name && (
          <div className="flex items-center gap-2 mt-2.5">
            {status.account_picture_url ? (
              <img
                src={status.account_picture_url}
                alt={status.account_name}
                className="w-6 h-6 rounded-full flex-shrink-0 bg-slate-100"
              />
            ) : (
              <div
                className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
                style={{ backgroundColor: meta.color }}
              >
                {status.account_name[0].toUpperCase()}
              </div>
            )}
            <span className="text-[12px] font-medium text-slate-700 truncate">
              {status.account_name}
            </span>
            {status.connected_at && (
              <span className="text-[11px] text-slate-400 flex-shrink-0">
                · desde {new Date(status.connected_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {isLoading ? null : connected ? (
          <>
            {confirmingDisconnect ? (
              <>
                <button
                  onClick={() => setConfirmingDisconnect(false)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  className="text-xs px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors flex items-center gap-1.5 disabled:opacity-60"
                >
                  {isDisconnecting ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Unlink className="w-3 h-3" />
                  )}
                  Confirmar
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleDisconnect}
                  className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-200 hover:bg-red-50 hover:border-red-200 text-slate-400 hover:text-red-500 transition-colors"
                  title="Desconectar"
                >
                  <Unlink className="w-3.5 h-3.5" />
                </button>
                <button className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5">
                  <ExternalLink className="w-3 h-3" />
                  Configurar
                </button>
              </>
            )}
          </>
        ) : disabled ? (
          <button
            disabled
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed"
          >
            Em breve
          </button>
        ) : (
          <button
            onClick={() => onConnect(meta.id)}
            disabled={isConnecting}
            className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5"
          >
            {isConnecting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : null}
            Conectar
          </button>
        )}
      </div>
    </div>
  )
}
