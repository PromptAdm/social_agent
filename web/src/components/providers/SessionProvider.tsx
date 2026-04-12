'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { tokens } from '@/lib/api/tokens'

/**
 * Ao montar, tenta restaurar a sessão chamando /api/auth/refresh
 * (que lê o cookie httpOnly sa_refresh_token).
 * Se bem-sucedido, busca /auth/me para hidratar o authStore.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { setAuth, setLoading, logout } = useAuthStore()

  useEffect(() => {
    async function hydrate() {
      try {
        // Tenta obter um novo access_token via refresh cookie
        const refreshRes = await fetch('/api/auth/refresh', { method: 'POST' })

        if (!refreshRes.ok) {
          logout()
          return
        }

        const { access_token } = await refreshRes.json()
        tokens.set(access_token)

        // Busca dados do usuário autenticado
        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
        const meRes  = await fetch(`${apiUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${access_token}` },
        })

        if (meRes.ok) {
          const user = await meRes.json()
          setAuth(user, access_token)
        } else {
          logout()
        }
      } catch {
        logout()
      }
    }

    hydrate()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <>{children}</>
}
