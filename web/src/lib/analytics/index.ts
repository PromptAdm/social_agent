/**
 * Analytics — PostHog client-side wrapper
 *
 * Princípios:
 *   - Client-side only: sem execução em SSR/Edge (guarda com typeof window)
 *   - Fail-silent: sem NEXT_PUBLIC_POSTHOG_KEY, todos os calls são no-op
 *   - Zero impacto de performance: PostHog é carregado de forma lazy
 *   - Tipado: eventos pré-definidos com propriedades esperadas
 *
 * Uso em qualquer componente ou hook:
 *   import { track, identify, reset } from '@/lib/analytics'
 *   track('post_created', { platform: 'instagram', brand_id: 1 })
 *
 * Identificação de usuário (feita automaticamente pelo PostHogProvider):
 *   identify(userId, { email, full_name, role })
 *
 * Reset ao fazer logout (feito automaticamente pelo PostHogProvider):
 *   reset()
 */

import posthog from 'posthog-js'

// ── Tipos de eventos ──────────────────────────────────────────────────────────

export type EventName =
  // Autenticação
  | 'login_attempted'
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'register_success'
  // Posts
  | 'post_generated'
  | 'post_created'
  | 'post_draft_saved'
  | 'post_submitted_for_approval'
  | 'post_approved'
  | 'post_rejected'
  | 'post_scheduled'
  | 'post_published'
  | 'post_publish_failed'
  | 'post_failed'
  // IA
  | 'ai_idea_generated'
  | 'ai_post_generated'
  | 'idea_converted_to_post'
  // Integrações
  | 'instagram_connected'
  | 'social_account_connected'
  // Imagens
  | 'image_generated'
  // Marcas
  | 'brand_created'
  | 'brand_strategy_updated'
  // Billing
  | 'subscription_started'
  | 'subscription_canceled'
  | 'payment_failed'
  | 'plan_upgraded'
  | 'plan_downgraded'
  // Créditos
  | 'credit_used'
  | 'credit_limit_reached'
  | 'extra_credit_granted'
  // Navegação
  | '$pageview'
  | '$pageleave'
  // Genérico — para eventos ad-hoc sem tipo fixo
  | (string & {})

export interface EventProperties {
  [key: string]: string | number | boolean | null | undefined
}

// ── Inicialização ─────────────────────────────────────────────────────────────

let _initialized = false

/**
 * Inicializa o PostHog. Chamado uma vez pelo PostHogProvider no mount.
 * No-op em SSR, no-op se a chave não estiver configurada.
 */
export function initPostHog(): void {
  if (typeof window === 'undefined') return
  if (_initialized) return

  const key  = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'

  if (!key) return  // sem chave → analytics desabilitado silenciosamente

  posthog.init(key, {
    api_host:           host,
    ui_host:            'https://us.posthog.com',   // sempre app.posthog.com para o UI
    capture_pageview:   false,  // controlamos manualmente via usePathname
    capture_pageleave:  true,
    autocapture:        false,  // opt-in explícito — evita ruído de cliques
    session_recording: {
      maskAllInputs: true,      // LGPD: mascara inputs por padrão
    },
    persistence: 'localStorage',
    loaded: (ph) => {
      if (process.env.NODE_ENV === 'development') {
        ph.debug()
      }
    },
  })

  _initialized = true
}

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * Rastreia um evento. No-op se PostHog não estiver inicializado.
 *
 * @param event      Nome do evento (use EventName para tipagem)
 * @param properties Propriedades opcionais do evento
 */
export function track(event: EventName, properties?: EventProperties): void {
  if (typeof window === 'undefined' || !_initialized) return
  try {
    posthog.capture(event, properties)
  } catch {
    // fail-silent
  }
}

/**
 * Associa o usuário autenticado ao ID anônimo do PostHog.
 * Chame após login ou carregamento de sessão.
 *
 * @param userId     ID único do usuário (string ou número)
 * @param properties Propriedades do perfil: email, full_name, role…
 */
export function identify(userId: string | number, properties?: EventProperties): void {
  if (typeof window === 'undefined' || !_initialized) return
  try {
    posthog.identify(String(userId), properties)
  } catch {
    // fail-silent
  }
}

/**
 * Desassocia o usuário e gera novo ID anônimo.
 * Chame ao fazer logout.
 */
export function reset(): void {
  if (typeof window === 'undefined' || !_initialized) return
  try {
    posthog.reset()
  } catch {
    // fail-silent
  }
}

/**
 * Acesso direto à instância PostHog (para feature flags, etc.).
 * Retorna null em SSR ou se não inicializado.
 */
export function getPostHog() {
  if (typeof window === 'undefined' || !_initialized) return null
  return posthog
}
