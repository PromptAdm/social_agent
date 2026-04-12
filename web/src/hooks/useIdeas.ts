import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/api/queryClient'
import { ideaService, type CreateIdeaPayload, type UpdateIdeaPayload, type GenerateIdeasPayload } from '@/services/ideaService'
import { toast } from '@/store/uiStore'
import { parseApiError } from '@/lib/api/errors'

export function useIdeas(brandId: number) {
  return useQuery({
    queryKey: queryKeys.ideas(brandId),
    queryFn:  () => ideaService.listByBrand(brandId),
    enabled:  !!brandId,
  })
}

export function useIdea(id: number) {
  return useQuery({
    queryKey: queryKeys.idea(id),
    queryFn:  () => ideaService.get(id),
    enabled:  !!id,
  })
}

export function useCreateIdea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ideaService.create,
    onSuccess: (idea) => {
      qc.invalidateQueries({ queryKey: queryKeys.ideas(idea.brand_id) })
      toast.success('Ideia criada.')
    },
    onError: (err) => toast.error(parseApiError(err)),
  })
}

export function useUpdateIdea(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateIdeaPayload) => ideaService.update(id, payload),
    onSuccess: (idea) => {
      qc.invalidateQueries({ queryKey: queryKeys.idea(id) })
      qc.invalidateQueries({ queryKey: queryKeys.ideas(idea.brand_id) })
      toast.success('Ideia atualizada.')
    },
    onError: (err) => toast.error(parseApiError(err)),
  })
}

export function useDeleteIdea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ideaService.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ideas'] })
      toast.success('Ideia removida.')
    },
    onError: (err) => toast.error(parseApiError(err)),
  })
}

export function useGenerateIdeas() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: GenerateIdeasPayload) => ideaService.generate(payload),
    onSuccess: (ideas) => {
      if (ideas.length > 0) {
        qc.invalidateQueries({ queryKey: queryKeys.ideas(ideas[0].brand_id) })
      }
      toast.success(`${ideas.length} ideias geradas.`)
    },
    onError: (err) => toast.error(parseApiError(err)),
  })
}

export function useIdeaToPost(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => ideaService.toPost(id),
    onSuccess: (post) => {
      qc.invalidateQueries({ queryKey: ['ideas'] })
      qc.invalidateQueries({ queryKey: queryKeys.posts(post.brand_id) })
      toast.success('Post criado a partir da ideia.')
    },
    onError: (err) => toast.error(parseApiError(err)),
  })
}
