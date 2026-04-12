import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/api/queryClient'
import { analyticsService } from '@/services/analyticsService'
import { panelService } from '@/services/panelService'

export function useAnalyticsSummary(brandId: number) {
  return useQuery({
    queryKey: queryKeys.analytics(brandId),
    queryFn:  () => analyticsService.summary(brandId),
    enabled:  !!brandId,
  })
}

export function useAnalyticsSnapshots(brandId: number) {
  return useQuery({
    queryKey: [...queryKeys.analytics(brandId), 'snapshots'],
    queryFn:  () => analyticsService.snapshots(brandId),
    enabled:  !!brandId,
  })
}

export function usePanelOverview(brandId: number) {
  return useQuery({
    queryKey: queryKeys.panel(brandId),
    queryFn:  () => panelService.overview(brandId),
    enabled:  !!brandId,
  })
}
