import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/api/queryClient'
import { postService, type CreatePostPayload, type UpdatePostPayload, type RejectPostPayload, type SchedulePostPayload } from '@/services/postService'
import { toast } from '@/store/uiStore'
import { parseApiError } from '@/lib/api/errors'
import { useUIStore } from '@/store/uiStore'

export function usePosts(brandId: number) {
  return useQuery({
    queryKey: queryKeys.posts(brandId),
    queryFn:  () => postService.listByBrand(brandId),
    enabled:  !!brandId,
  })
}

export function usePost(id: number) {
  return useQuery({
    queryKey: queryKeys.post(id),
    queryFn:  () => postService.get(id),
    enabled:  !!id,
  })
}

export function useCreatePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: postService.create,
    onSuccess: (post) => {
      qc.invalidateQueries({ queryKey: queryKeys.posts(post.brand_id) })
      toast.success('Post criado.')
    },
    onError: (err) => toast.error(parseApiError(err)),
  })
}

export function useUpdatePost(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdatePostPayload) => postService.update(id, payload),
    onSuccess: (post) => {
      qc.invalidateQueries({ queryKey: queryKeys.post(id) })
      qc.invalidateQueries({ queryKey: queryKeys.posts(post.brand_id) })
      toast.success('Post atualizado.')
    },
    onError: (err) => toast.error(parseApiError(err)),
  })
}

export function useDeletePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: postService.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['posts'] })
      toast.success('Post removido.')
    },
    onError: (err) => toast.error(parseApiError(err)),
  })
}

export function useApprovePost() {
  const qc = useQueryClient()
  const setPending = useUIStore((s) => s.setPendingApprovals)
  return useMutation({
    mutationFn: (id: number) => postService.approve(id),
    onSuccess: (post) => {
      qc.invalidateQueries({ queryKey: queryKeys.posts(post.brand_id) })
      qc.invalidateQueries({ queryKey: ['posts'] })
      toast.success('Post aprovado.')
    },
    onError: (err) => toast.error(parseApiError(err)),
  })
}

export function useRejectPost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: RejectPostPayload }) =>
      postService.reject(id, payload),
    onSuccess: (post) => {
      qc.invalidateQueries({ queryKey: queryKeys.posts(post.brand_id) })
      qc.invalidateQueries({ queryKey: ['posts'] })
      toast.success('Post rejeitado.')
    },
    onError: (err) => toast.error(parseApiError(err)),
  })
}

export function useSchedulePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: SchedulePostPayload }) =>
      postService.schedule(id, payload),
    onSuccess: (post) => {
      qc.invalidateQueries({ queryKey: queryKeys.posts(post.brand_id) })
      toast.success('Post agendado.')
    },
    onError: (err) => toast.error(parseApiError(err)),
  })
}

export function usePublishPost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => postService.publish(id),
    onSuccess: (post) => {
      qc.invalidateQueries({ queryKey: queryKeys.posts(post.brand_id) })
      toast.success('Post publicado.')
    },
    onError: (err) => toast.error(parseApiError(err)),
  })
}

export function useDuplicatePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => postService.duplicate(id),
    onSuccess: (post) => {
      qc.invalidateQueries({ queryKey: queryKeys.posts(post.brand_id) })
      toast.success('Post duplicado.')
    },
    onError: (err) => toast.error(parseApiError(err)),
  })
}
