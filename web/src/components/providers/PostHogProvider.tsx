'use client'

/**
 * PostHogProvider
 *
 * Responsabilidades:
 *   1. Inicializar PostHog uma vez (no mount, client-side)
 *   2. Rastrear pageviews em cada mudança de rota (usePathname)
 *   3. Identificar o usuário autenticado (reativo ao authStore)
 *   4. Resetar identidade ao fazer logout
 *
 * Não altera nenhum comportamento existente — é puramente observador.
 * Se NEXT_PUBLIC_POSTHOG_KEY não estiver definida, todos os calls são no-op.
 *
 * Montado no root layout, antes de qualquer conteúdo de página:
 *   <PostHogProvider>
 *     <SessionProvider>
 *       {children}
 *     </SessionProvider>
 *   </PostHogProvider>
 */

import { Suspense, useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { initPostHog, track, identify, reset } from '@/lib/analytics'

interface PostHogProviderProps {
  children: React.ReactNode
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  // ── Inicialização (apenas uma vez, client-side) ───────────────────────────
  useEffect(() => {
    initPostHog()
  }, [])

  return (
    <>
      {/*
        PageViewTracker usa useSearchParams ��� precisa de Suspense boundary
        (requisito do Next.js App Router para componentes com search params).
        O fallback null garante que não há layout shift.
      */}
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      <UserIdentifier />
      {children}
    </>
  )
}

// ── Rastreamento de pageview ──────────────────────────────────────────────────

/**
 * Rastreia $pageview a cada mudança de rota (pathname + search params).
 * Separado em componente filho para evitar re-renders desnecessários no Provider.
 */
function PageViewTracker() {
  const pathname     = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!pathname) return

    const url = searchParams?.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname

    track('$pageview', { $current_url: url, pathname })
  }, [pathname, searchParams])

  return null
}

// ── Identificação de usuário ──────────────────────────────────────────────────

/**
 * Observa o authStore e:
 *   - user → não-null: identifica o usuário no PostHog
 *   - user → null:     reseta a identidade (logout)
 *
 * Usa ref para evitar re-identificar o mesmo usuário a cada re-render.
 */
function UserIdentifier() {
  const user           = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const lastUserIdRef  = useRef<number | null>(null)

  useEffect(() => {
    if (isAuthenticated && user) {
      // Só chama identify quando o usuário muda (ex: troca de conta)
      if (lastUserIdRef.current !== user.id) {
        identify(user.id, {
          email:     user.email,
          full_name: user.full_name ?? undefined,
          role:      user.role ?? undefined,
        })
        lastUserIdRef.current = user.id
      }
    } else if (!isAuthenticated && lastUserIdRef.current !== null) {
      // Logout: reseta identidade e limpa ref
      reset()
      lastUserIdRef.current = null
    }
  }, [user, isAuthenticated])

  return null
}
