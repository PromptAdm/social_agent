'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'

/**
 * Bloqueia o dashboard enquanto a sessão está sendo hidratada.
 * Se após a hidratação o usuário não estiver autenticado, redireciona para /login.
 *
 * O middleware já garante que apenas usuários com cookie sa_refresh_token
 * chegam aqui — este componente é a segunda linha de defesa para casos onde
 * o cookie existe mas a sessão expirou ou foi revogada.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const isLoading       = useAuthStore((s) => s.isLoading)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const router          = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login')
    }
  }, [isLoading, isAuthenticated, router])

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F5F4FB]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-indigo-600/30 border-t-indigo-500 rounded-full animate-spin" />
          <span className="text-xs text-slate-600">Carregando…</span>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
