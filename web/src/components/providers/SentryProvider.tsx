'use client'

import { useEffect, useRef } from 'react'
import * as Sentry from '@sentry/nextjs'
import { useAuthStore } from '@/store/authStore'

export function SentryProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SentryUserIdentifier />
      {children}
    </>
  )
}

function SentryUserIdentifier() {
  const user           = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const lastUserIdRef  = useRef<number | null>(null)

  useEffect(() => {
    if (isAuthenticated && user) {
      if (lastUserIdRef.current !== user.id) {
        Sentry.setUser({
          id:       String(user.id),
          email:    user.email,
          username: user.full_name ?? undefined,
        })
        lastUserIdRef.current = user.id
      }
    } else if (!isAuthenticated && lastUserIdRef.current !== null) {
      Sentry.setUser(null)
      lastUserIdRef.current = null
    }
  }, [user, isAuthenticated])

  return null
}
