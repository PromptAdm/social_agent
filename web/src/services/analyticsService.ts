import { apiClient as api } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'

export interface AnalyticsSummary {
  total_posts:         number
  total_published:     number
  total_reach:         number
  total_engagement:    number
  engagement_rate:     number
  top_platform:        string | null
  posts_this_month:    number
  ideas_pending:       number
  approval_pending:    number
}

export interface PlatformSnapshot {
  id:           number
  brand_id:     number
  platform:     string
  followers:    number
  reach:        number
  engagement:   number
  posts_count:  number
  recorded_at:  string
}

export const analyticsService = {
  summary: (brandId: number): Promise<AnalyticsSummary> =>
    api.get(API.analytics.summary(brandId)).then((r) => r.data),

  snapshots: (brandId: number): Promise<PlatformSnapshot[]> =>
    api.get(API.analytics.snapshots(brandId)).then((r) => r.data),
}
