'use client'

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'

const LOADING_DEADLINE_MS = 10_000 // after 10 s still loading → force logout

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const isLoading       = useAuthStore((s) => s.isLoading)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const logout          = useAuthStore((s) => s.logout)
  const router          = useRouter()
  const pathname        = usePathname()
  const deadlineRef     = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debug — visible in browser console during QA
  useEffect(() => {
    console.log('[AuthGuard]', { pathname, isLoading, isAuthenticated })
  })

  // Redirect when session is definitively absent
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('[AuthGuard] not authenticated → redirecting to /login')
      router.replace('/login')
    }
  }, [isLoading, isAuthenticated, router])

  // Safety: if isLoading never resolves (e.g. backend hung after the
  // SessionProvider timeout missed it), force a logout so we redirect.
  useEffect(() => {
    if (isLoading) {
      deadlineRef.current = setTimeout(() => {
        console.warn('[AuthGuard] loading deadline exceeded → forcing logout')
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

  // Block render until we know the auth state
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
