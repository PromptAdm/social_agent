// Todas as URLs da API FastAPI como constantes tipadas.
// Base: NEXT_PUBLIC_API_URL (ex: http://localhost:8000/api/v1)

export const API = {
  auth: {
    login:   '/auth/login',
    refresh: '/auth/refresh',
    me:      '/auth/me',
  },

  brands: {
    list:   '/brands/',
    create: '/brands/',
    get:    (id: number) => `/brands/${id}`,
    update: (id: number) => `/brands/${id}`,
    delete: (id: number) => `/brands/${id}`,
  },

  pillars: {
    listByBrand: (brandId: number) => `/brands/${brandId}/pillars`,
    create:      (brandId: number) => `/brands/${brandId}/pillars`,
    get:         (id: number) => `/content-pillars/${id}`,
    update:      (id: number) => `/content-pillars/${id}`,
    delete:      (id: number) => `/content-pillars/${id}`,
  },

  posts: {
    create:      '/posts/',
    listByBrand: (brandId: number) => `/posts/brand/${brandId}`,
    get:         (id: number) => `/posts/${id}`,
    update:      (id: number) => `/posts/${id}`,
    delete:      (id: number) => `/posts/${id}`,
    approve:     (id: number) => `/posts/${id}/approve`,
    reject:      (id: number) => `/posts/${id}/reject`,
    schedule:    (id: number) => `/posts/${id}/schedule`,
    publish:     (id: number) => `/posts/${id}/publish`,
    duplicate:   (id: number) => `/posts/${id}/duplicate`,
  },

  ideas: {
    create:      '/ideas/',
    listByBrand: (brandId: number) => `/ideas/brand/${brandId}`,
    get:         (id: number) => `/ideas/${id}`,
    update:      (id: number) => `/ideas/${id}`,
    delete:      (id: number) => `/ideas/${id}`,
    generate:    '/ideas/generate',
    toPost:      (id: number) => `/ideas/${id}/to-post`,
  },

  leads: {
    create:      '/leads/',
    listByBrand: (brandId: number) => `/leads/brand/${brandId}`,
    get:         (id: number) => `/leads/${id}`,
    update:      (id: number) => `/leads/${id}`,
    delete:      (id: number) => `/leads/${id}`,
  },

  analytics: {
    summary:   (brandId: number) => `/analytics/brand/${brandId}/summary`,
    snapshots: (brandId: number) => `/analytics/brand/${brandId}/snapshots`,
  },

  panel: {
    overview: (brandId: number) => `/panel/brand/${brandId}`,
  },

  publishing: {
    scheduled: '/publishing/scheduled',
  },

  billing: {
    summary:         '/billing/summary',
    plans:           '/billing/plans',
    usage:           '/billing/usage',
    trialStart:      '/billing/trial/start',
    checkout:        '/billing/create-checkout-session',
    portal:          '/billing/portal',
  },

  credits: {
    balance: '/credits/balance',
    logs:    '/credits/logs',
  },

  projects: {
    history:     '/projects/history',
    image:       (id: number) => `/projects/image/${id}`,
    video:       (id: number) => `/projects/video/${id}`,
    deleteImage: (id: number) => `/projects/image/${id}`,
    deleteVideo: (id: number) => `/projects/video/${id}`,
  },

  upload: {
    file: '/upload/',
  },

  integrations: {
    status:     '/integrations/status',
    accounts:   '/integrations/accounts',
    connect:    (provider: string) => `/integrations/connect/${provider}`,
    disconnect: (accountId: number) => `/integrations/accounts/${accountId}`,
  },
} as const
