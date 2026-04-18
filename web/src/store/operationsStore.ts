import { create } from 'zustand'

export type OperationStatus = 'loading' | 'success' | 'error'
export type OperationType = 'upload' | 'generate' | 'poll' | 'delete'

export interface Operation {
  id: string
  type: OperationType
  label: string
  status: OperationStatus
  progress?: number
  message?: string
  createdAt: number
}

interface OperationsState {
  operations: Record<string, Operation>

  start: (id: string, type: OperationType, label: string) => void
  progress: (id: string, percent: number) => void
  complete: (id: string, message?: string) => void
  fail: (id: string, message: string) => void
  clear: (id: string) => void
  clearAll: () => void
}

export const useOperationsStore = create<OperationsState>((set) => ({
  operations: {},

  start: (id, type, label) =>
    set((s) => {
      const current = s.operations[id]
      if (
        current &&
        current.type === type &&
        current.label === label &&
        current.status === 'loading'
      ) {
        return s
      }

      return {
        operations: {
          ...s.operations,
          [id]: { id, type, label, status: 'loading', createdAt: Date.now() },
        },
      }
    }),

  progress: (id, percent) =>
    set((s) => {
      const op = s.operations[id]
      if (!op) return s
      if (op.progress === percent) return s

      return {
        operations: {
          ...s.operations,
          [id]: { ...op, progress: percent },
        },
      }
    }),

  complete: (id, message) =>
    set((s) => {
      const op = s.operations[id]
      if (!op) return s
      if (op.status === 'success' && op.message === message && op.progress === 100) return s

      return {
        operations: {
          ...s.operations,
          [id]: { ...op, status: 'success', message, progress: 100 },
        },
      }
    }),

  fail: (id, message) =>
    set((s) => {
      const op = s.operations[id]
      if (!op) return s
      if (op.status === 'error' && op.message === message) return s

      return {
        operations: {
          ...s.operations,
          [id]: { ...op, status: 'error', message },
        },
      }
    }),

  clear: (id) =>
    set((s) => {
      if (!s.operations[id]) return s
      const next = { ...s.operations }
      delete next[id]
      return { operations: next }
    }),

  clearAll: () =>
    set((s) => {
      if (Object.keys(s.operations).length === 0) return s
      return { operations: {} }
    }),
}))

export const ops = {
  start: (id: string, type: OperationType, label: string) =>
    useOperationsStore.getState().start(id, type, label),
  progress: (id: string, pct: number) =>
    useOperationsStore.getState().progress(id, pct),
  complete: (id: string, msg?: string) =>
    useOperationsStore.getState().complete(id, msg),
  fail: (id: string, msg: string) =>
    useOperationsStore.getState().fail(id, msg),
  clear: (id: string) =>
    useOperationsStore.getState().clear(id),
}