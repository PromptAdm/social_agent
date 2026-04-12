import { create } from 'zustand'

interface Toast {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
}

interface UIState {
  // Toasts
  toasts: Toast[]
  addToast: (type: Toast['type'], message: string) => void
  removeToast: (id: string) => void

  // Pending approvals badge
  pendingApprovals: number
  setPendingApprovals: (n: number) => void
}

export const useUIStore = create<UIState>((set) => ({
  toasts: [],

  addToast: (type, message) => {
    const id = Math.random().toString(36).slice(2)
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }))
    // Auto-dismiss após 4s (erros: 7s)
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, type === 'error' ? 7000 : 4000)
  },

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  pendingApprovals: 0,
  setPendingApprovals: (n) => set({ pendingApprovals: n }),
}))

// ── Helpers de conveniência ───────────────────────────────────────────────────
export const toast = {
  success: (msg: string) => useUIStore.getState().addToast('success', msg),
  error:   (msg: string) => useUIStore.getState().addToast('error',   msg),
  info:    (msg: string) => useUIStore.getState().addToast('info',    msg),
  warning: (msg: string) => useUIStore.getState().addToast('warning', msg),
}
