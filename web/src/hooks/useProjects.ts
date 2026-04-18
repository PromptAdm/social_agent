'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/api/queryClient'
import { projectService } from '@/services/projectService'

export function useProjectHistory(limit = 20, offset = 0) {
  return useQuery({
    queryKey: queryKeys.projectHistory(limit, offset),
    queryFn:  () => projectService.history(limit, offset),
    staleTime: 30 * 1000,
    retry: false,
  })
}

export function useImageProject(id: number) {
  return useQuery({
    queryKey: queryKeys.imageProject(id),
    queryFn:  () => projectService.getImage(id),
    staleTime: 10 * 1000,
    enabled:  id > 0,
  })
}

export function useVideoProject(id: number) {
  return useQuery({
    queryKey: queryKeys.videoProject(id),
    queryFn:  () => projectService.getVideo(id),
    staleTime: 10 * 1000,
    enabled:  id > 0,
  })
}

export function useDeleteImageProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => projectService.deleteImage(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useDeleteVideoProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => projectService.deleteVideo(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}
