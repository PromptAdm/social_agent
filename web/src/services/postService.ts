import { apiClient as api } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'
import type { Post, PostStatus, PostFormato, PostPrioridade, SocialPlatform } from '@/types'

export interface CreatePostPayload {
  brand_id:    number
  pillar_id?:  number
  caption:     string
  hashtags?:   string
  cta?:        string
  platform:    SocialPlatform
  formato:     PostFormato
  prioridade?: PostPrioridade
}

export interface UpdatePostPayload {
  caption?:    string
  hashtags?:   string
  cta?:        string
  platform?:   SocialPlatform
  formato?:    PostFormato
  prioridade?: PostPrioridade
  pillar_id?:  number | null
  status?:     PostStatus
  scheduled_at?: string | null
}

export interface RejectPostPayload {
  reason: string
}

export interface SchedulePostPayload {
  scheduled_at: string // ISO datetime
}

export const postService = {
  listByBrand: (brandId: number): Promise<Post[]> =>
    api.get(API.posts.listByBrand(brandId)).then((r) => r.data),

  get: (id: number): Promise<Post> =>
    api.get(API.posts.get(id)).then((r) => r.data),

  create: (payload: CreatePostPayload): Promise<Post> =>
    api.post(API.posts.create, payload).then((r) => r.data),

  update: (id: number, payload: UpdatePostPayload): Promise<Post> =>
    api.patch(API.posts.update(id), payload).then((r) => r.data),

  delete: (id: number): Promise<void> =>
    api.delete(API.posts.delete(id)).then(() => undefined),

  approve: (id: number): Promise<Post> =>
    api.post(API.posts.approve(id)).then((r) => r.data),

  reject: (id: number, payload: RejectPostPayload): Promise<Post> =>
    api.post(API.posts.reject(id), payload).then((r) => r.data),

  schedule: (id: number, payload: SchedulePostPayload): Promise<Post> =>
    api.post(API.posts.schedule(id), payload).then((r) => r.data),

  publish: (id: number): Promise<Post> =>
    api.post(API.posts.publish(id)).then((r) => r.data),

  duplicate: (id: number): Promise<Post> =>
    api.post(API.posts.duplicate(id)).then((r) => r.data),
}
