import { apiClient as api } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'
import type { Idea, IdeaStatus, IdeaPrioridade, IdeaFormatoSugerido, SocialPlatform } from '@/types'

export interface CreateIdeaPayload {
  brand_id:          number
  pillar_id?:        number
  titulo:            string
  descricao?:        string
  formato_sugerido?: IdeaFormatoSugerido
  plataforma?:       SocialPlatform
  prioridade?:       IdeaPrioridade
  tags?:             string[]
}

export interface UpdateIdeaPayload extends Partial<CreateIdeaPayload> {
  status?: IdeaStatus
}

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
  plataforma?: import('@/types').SocialPlatform
  formato?:    import('@/types').IdeaFormatoSugerido
  contexto?:   string // contexto adicional para a IA
}

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

  generate: (payload: GenerateIdeasPayload): Promise<Idea[]> =>
    api.post(API.ideas.generate, payload).then((r) => r.data),

  toPost: (id: number): Promise<import('@/types').Post> =>
    api.post(API.ideas.toPost(id)).then((r) => r.data),
}
