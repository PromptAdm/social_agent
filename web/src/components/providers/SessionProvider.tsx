'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { tokens } from '@/lib/api/tokens'

// If the backend never responds within this window, treat as logged-out.
// Kept short because ECONNREFUSED is near-instant on localhost.
const HYDRATION_TIMEOUT_MS = 3_000

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { setAuth, logout } = useAuthStore()

  useEffect(() => {
    let cancelled = false

    // Safe logout: only logout if the user isn't already authenticated from
    // a concurrent login form submission that ran setAuth() in parallel.
    function safeLogout(reason: string) {
      const { isAuthenticated, isLoading } = useAuthStore.getState()
      if (isAuthenticated) {
        console.log(`[SessionProvider] ${reason} — skipping logout, user already authenticated`)
        // Still need to clear isLoading if it's somehow still true
        if (isLoading) useAuthStore.getState().setLoading(false)
        return
      }
      console.log(`[SessionProvider] ${reason} — calling logout()`)
      logout()
    }

    // Safety net: if hydrate() hangs past the deadline, force resolution.
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        console.warn('[SessionProvider] hydration timeout — forcing resolution')
        safeLogout('timeout')
      }
    }, HYDRATION_TIMEOUT_MS)

    async function hydrate() {
      console.log('[SessionProvider] hydration start — isLoading=true')

      try {
        const refreshRes = await fetch('/api/auth/refresh', { method: 'POST' })
        console.log('[SessionProvider] /refresh →', refreshRes.status)

        if (!refreshRes.ok) {
          if (!cancelled) safeLogout(`/refresh ${refreshRes.status}`)
          return
        }

        const json = await refreshRes.json()
        const access_token: string = json.access_token
        if (!access_token) {
          console.warn('[SessionProvider] /refresh ok but no access_token in response')
          if (!cancelled) safeLogout('missing access_token')
          return
        }

        tokens.set(access_token)

        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

        // Direct call to FastAPI /me — add timeout so it can't hang indefinitely
        const meRes = await fetch(`${apiUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${access_token}` },
          signal:  AbortSignal.timeout(4_000),
        })
        console.log('[SessionProvider] /me →', meRes.status)

        if (cancelled) return

        if (meRes.ok) {
          const user = await meRes.json()
          console.log('[SessionProvider] hydration succeeded — user:', user?.email,
            '| isAuthenticated (before setAuth):', useAuthStore.getState().isAuthenticated)
          setAuth(user, access_token)
        } else {
          safeLogout(`/me ${meRes.status}`)
        }

      } catch (err) {
        console.warn('[SessionProvider] hydration error:', err)
        if (!cancelled) safeLogout('catch')

      } finally {
        clearTimeout(timeoutId)

        // Guarantee: isLoading must ALWAYS become false after hydration ends,
        // even if cancelled=true prevented setAuth/logout from running.
        if (!cancelled) {
          const s = useAuthStore.getState()
          if (s.isLoading) {
            console.log('[SessionProvider] finally — clearing stuck isLoading via setLoading(false)')
            s.setLoading(false)
          }
        }

        console.log('[SessionProvider] hydration end — cancelled=', cancelled,
          '| state:', {
            isLoading:       useAuthStore.getState().isLoading,
            isAuthenticated: useAuthStore.getState().isAuthenticated,
          })
      }
    }

    hydrate()

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  // setAuth and logout are stable Zustand references — safe to omit
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <>{children}</>
}
