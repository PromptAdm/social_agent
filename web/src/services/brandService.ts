import { apiClient as api } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'
import type { Brand, ContentPillar } from '@/types'

// ── Brand payloads ─────────────────────────────────────────────────────────────

export interface CreateBrandPayload {
  name:           string
  niche?:         string
  description?:   string
  tone_of_voice?: string
}

export interface UpdateBrandPayload extends Partial<CreateBrandPayload> {}

// ── Brand service ──────────────────────────────────────────────────────────────

export const brandService = {
  list: (): Promise<Brand[]> =>
    api.get(API.brands.list).then((r) => r.data),

  get: (id: number): Promise<Brand> =>
    api.get(API.brands.get(id)).then((r) => r.data),

  create: (payload: CreateBrandPayload): Promise<Brand> =>
    api.post(API.brands.create, payload).then((r) => r.data),

  update: (id: number, payload: UpdateBrandPayload): Promise<Brand> =>
    api.put(API.brands.update(id), payload).then((r) => r.data),

  delete: (id: number): Promise<void> =>
    api.delete(API.brands.delete(id)).then(() => undefined),
}

// ── Pillar payloads ────────────────────────────────────────────────────────────

export interface CreatePillarPayload {
  name:         string
  description?: string
  color?:       string
}

export interface UpdatePillarPayload extends Partial<CreatePillarPayload> {}

// ── Pillar service ─────────────────────────────────────────────────────────────

export const pillarService = {
  listByBrand: (brandId: number): Promise<ContentPillar[]> =>
    api.get(API.pillars.listByBrand(brandId)).then((r) => r.data),

  create: (brandId: number, payload: CreatePillarPayload): Promise<ContentPillar> =>
    api.post(API.pillars.create(brandId), payload).then((r) => r.data),

  update: (id: number, payload: UpdatePillarPayload): Promise<ContentPillar> =>
    api.put(API.pillars.update(id), payload).then((r) => r.data),

  delete: (id: number): Promise<void> =>
    api.delete(API.pillars.delete(id)).then(() => undefined),
}
