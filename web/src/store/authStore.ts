import { create } from 'zustand'
import { tokens } from '@/lib/api/tokens'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean           // hydration inicial (check de sessão)

  setAuth:  (user: User, accessToken: string) => void
  setUser:  (user: User) => void
  logout:   () => void
  setLoading: (v: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user:            null,
  isAuthenticated: false,
  isLoading:       true,  // começa carregando até o check de sessão completar

  setAuth: (user, accessToken) => {
    tokens.set(accessToken)
    set({ user, isAuthenticated: true, isLoading: false })
  },

  setUser: (user) => set({ user }),

  logout: () => {
    tokens.clear()
    set({ user: null, isAuthenticated: false, isLoading: false })
  },

  setLoading: (v) => set({ isLoading: v }),
}))
