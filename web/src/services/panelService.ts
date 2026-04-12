import { apiClient as api } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'
import type { Post, Idea } from '@/types'

export interface PanelOverview {
  brand_id:          number
  pending_approval:  number
  scheduled_posts:   number
  ideas_pending:     number
  posts_this_week:   Post[]
  recent_ideas:      Idea[]
  upcoming_posts:    Post[]
}

export const panelService = {
  overview: (brandId: number): Promise<PanelOverview> =>
    api.get(API.panel.overview(brandId)).then((r) => r.data),
}
