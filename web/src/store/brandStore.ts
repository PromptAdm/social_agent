import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Brand } from '@/types'

interface BrandState {
  activeBrand: Brand | null
  setActiveBrand: (brand: Brand) => void
  clearActiveBrand: () => void
}

// Persiste o ID da brand ativa no localStorage para sobreviver a refresh.
// O objeto Brand completo será buscado da query do React Query.
export const useBrandStore = create<BrandState>()(
  persist(
    (set) => ({
      activeBrand: null,
      setActiveBrand:  (brand) => set({ activeBrand: brand }),
      clearActiveBrand: ()     => set({ activeBrand: null }),
    }),
    {
      name: 'sa-active-brand',
      partialize: (state) => ({ activeBrand: state.activeBrand }),
    }
  )
)
