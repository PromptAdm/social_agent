import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:          1000 * 60 * 2,  // 2 min: considera dado fresco
      gcTime:             1000 * 60 * 10, // 10 min: mantém no cache
      retry:              1,
      refetchOnWindowFocus: true,
    },
    mutations: {
      // Erros de mutation são tratados nos próprios hooks com onError
    },
  },
})

// ── Hierarquia de cache keys ──────────────────────────────────────────────────
// Convênção: ['recurso', id | filtros] para invalidação cirúrgica.

export const queryKeys = {
  // Auth
  me: () => ['me'] as const,

  // Brands
  brands:     ()         => ['brands'] as const,
  brand:      (id: number) => ['brands', id] as const,

  // Posts
  posts:      (brandId: number, filters?: object) => ['posts', brandId, filters ?? {}] as const,
  post:       (id: number)                         => ['posts', 'detail', id] as const,

  // Ideas
  ideas:      (brandId: number, filters?: object) => ['ideas', brandId, filters ?? {}] as const,
  idea:       (id: number)                         => ['ideas', 'detail', id] as const,

  // Leads
  leads:      (brandId: number, filters?: object) => ['leads', brandId, filters ?? {}] as const,

  // Pillars
  pillars:    (brandId: number) => ['pillars', brandId] as const,

  // Analytics
  analytics:  (brandId: number, period?: string)  => ['analytics', brandId, period ?? '30d'] as const,

  // Panel (dashboard)
  panel:      (brandId: number) => ['panel', brandId] as const,

  // Billing
  billing:      () => ['billing', 'summary'] as const,
  billingPlans: () => ['billing', 'plans']   as const,
  billingUsage: () => ['billing', 'usage']   as const,

  // Credits
  creditBalance: ()               => ['credits', 'balance']              as const,
  creditLogs:    (offset = 0)     => ['credits', 'logs', offset]         as const,

  // Projects
  projectHistory: (limit = 20, offset = 0) => ['projects', 'history', limit, offset] as const,
  imageProject:   (id: number)             => ['projects', 'image', id]  as const,
  videoProject:   (id: number)             => ['projects', 'video', id]  as const,
}
