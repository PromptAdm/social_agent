'use client'

import { useAuthStore } from '@/store/authStore'

/**
 * Bloqueia a renderização do dashboard enquanto o SessionProvider
 * ainda está hidratando o store (isLoading = true).
 *
 * O middleware já garante que apenas usuários com cookie sa_refresh_token
 * chegam aqui, então a hidratação é sempre esperada ter sucesso.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const isLoading = useAuthStore((s) => s.isLoading)

  if (isLoading) {
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
