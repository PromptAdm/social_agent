import { apiClient as api } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'
import type { Idea, IdeaStatus, IdeaPrioridade, IdeaFormatoSugerido, SocialPlatform } from '@/types'

// ── Create / Update payloads ───────────────────────────────────────────────────
// Field names match the backend IdeaCreate / IdeaUpdate schemas (English names).

export interface CreateIdeaPayload {
  brand_id:          number
  pillar_id?:        number
  title:             string        // backend: title (was: titulo)
  description?:      string        // backend: description (was: descricao)
  formato_sugerido?: IdeaFormatoSugerido
  prioridade?:       IdeaPrioridade
  source?:           string
}

export interface UpdateIdeaPayload {
  title?:            string
  description?:      string
  pillar_id?:        number | null
  status?:           IdeaStatus
  prioridade?:       IdeaPrioridade
  formato_sugerido?: IdeaFormatoSugerido
}

// ── Generate payload ───────────────────────────────────────────────────────────

export type IdeaObjetivo =
  | 'engajamento'
  | 'educacao'
  | 'vendas'
  | 'awareness'
  | 'entretenimento'
  | 'autoridade'

export interface GenerateIdeasPayload {
  brand_id:    number
  pillar_id?:  number
  quantidade?: number
  tema?:       string
  objetivo?:   IdeaObjetivo
  plataforma?: SocialPlatform
  formato?:    IdeaFormatoSugerido
  contexto?:   string
}

// ── Response shape from POST /ideas/generate ─────────────────────────────────

interface IdeaGenerateOut {
  ideas:           Idea[]
  generated_count: number
  source:          string
}

// ── Service ───────────────────────────────────────────────────────────────────

export const ideaService = {
  listByBrand: (brandId: number): Promise<Idea[]> =>
    api.get(API.ideas.listByBrand(brandId)).then((r) => r.data),

  get: (id: number): Promise<Idea> =>
    api.get(API.ideas.get(id)).then((r) => r.data),

  create: (payload: CreateIdeaPayload): Promise<Idea> =>
    api.post(API.ideas.create, payload).then((r) => r.data),

  update: (id: number, payload: UpdateIdeaPayload): Promise<Idea> =>
    api.put(API.ideas.update(id), payload).then((r) => r.data),

  delete: (id: number): Promise<void> =>
    api.delete(API.ideas.delete(id)).then(() => undefined),

  /**
   * Gera ideias via IA e persiste no banco.
   * Retorna o array de Idea com IDs reais (prontos para converter em post).
   */
  generate: (payload: GenerateIdeasPayload): Promise<Idea[]> =>
    api
      .post(API.ideas.generate, payload)
      .then((r) => (r.data as IdeaGenerateOut).ideas),

  toPost: (id: number): Promise<import('@/types').Post> =>
    api.post(API.ideas.toPost(id)).then((r) => r.data),
}
