'use client'

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'

// If isLoading is still true after this deadline, force logout to break any hang.
const LOADING_DEADLINE_MS = 4_000

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const isLoading       = useAuthStore((s) => s.isLoading)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const logout          = useAuthStore((s) => s.logout)
  const router          = useRouter()
  const pathname        = usePathname()
  const deadlineRef     = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Diagnostic log every render — visible in browser DevTools during QA
  useEffect(() => {
    console.log('[AuthGuard]', { pathname, isLoading, isAuthenticated })
  })

  // Only redirect when we are CERTAIN the user is not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('[AuthGuard] not authenticated → /login')
      router.replace('/login')
    }
  }, [isLoading, isAuthenticated, router])

  // Safety: break any infinite loading if SessionProvider never resolves
  useEffect(() => {
    if (isLoading) {
      deadlineRef.current = setTimeout(() => {
        console.warn('[AuthGuard] LOADING DEADLINE exceeded — forcing logout to break hang')
        logout()
      }, LOADING_DEADLINE_MS)
    } else {
      if (deadlineRef.current) {
        clearTimeout(deadlineRef.current)
        deadlineRef.current = null
      }
    }
    return () => {
      if (deadlineRef.current) clearTimeout(deadlineRef.current)
    }
  }, [isLoading, logout])

  // Block render only while auth state is genuinely unknown
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
