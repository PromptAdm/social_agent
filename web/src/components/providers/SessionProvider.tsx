'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { tokens } from '@/lib/api/tokens'

const HYDRATION_TIMEOUT_MS = 8_000 // treat as logged-out after 8 s with no response

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { setAuth, logout } = useAuthStore()

  useEffect(() => {
    let cancelled = false

    // Safety: if the backend never responds, treat as logged-out so AuthGuard
    // can redirect instead of showing an endless spinner.
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        console.warn('[SessionProvider] hydration timed out — forcing logout')
        logout()
      }
    }, HYDRATION_TIMEOUT_MS)

    async function hydrate() {
      try {
        console.log('[SessionProvider] starting hydration')

        const refreshRes = await fetch('/api/auth/refresh', { method: 'POST' })

        if (!refreshRes.ok) {
          console.log('[SessionProvider] refresh failed, status:', refreshRes.status)
          if (!cancelled) logout()
          return
        }

        const { access_token } = await refreshRes.json()
        tokens.set(access_token)

        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
        const meRes  = await fetch(`${apiUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${access_token}` },
        })

        if (cancelled) return

        if (meRes.ok) {
          const user = await meRes.json()
          console.log('[SessionProvider] hydration succeeded, user:', user?.email)
          setAuth(user, access_token)
        } else {
          console.log('[SessionProvider] /me failed, status:', meRes.status)
          logout()
        }
      } catch (err) {
        console.warn('[SessionProvider] hydration error:', err)
        if (!cancelled) logout()
      } finally {
        clearTimeout(timeoutId)
      }
    }

    hydrate()

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <>{children}</>
}
