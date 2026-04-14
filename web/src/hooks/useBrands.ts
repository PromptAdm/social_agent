import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/api/queryClient'
import {
  brandService, pillarService,
  type CreateBrandPayload, type UpdateBrandPayload,
  type CreatePillarPayload, type UpdatePillarPayload,
} from '@/services/brandService'
import { toast } from '@/store/uiStore'
import { parseApiError } from '@/lib/api/errors'

// ── Brands ────────────────────────────────────────────────────────────────────

export function useBrands() {
  return useQuery({
    queryKey: queryKeys.brands(),
    queryFn:  brandService.list,
  })
}

export function useBrand(id: number) {
  return useQuery({
    queryKey: queryKeys.brand(id),
    queryFn:  () => brandService.get(id),
    enabled:  !!id,
  })
}

export function useCreateBrand() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateBrandPayload) => brandService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.brands() })
      toast.success('Marca criada com sucesso.')
    },
    onError: (err) => toast.error(parseApiError(err)),
  })
}

export function useUpdateBrand(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateBrandPayload) => brandService.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.brand(id) })
      qc.invalidateQueries({ queryKey: queryKeys.brands() })
      toast.success('Marca atualizada.')
    },
    onError: (err) => toast.error(parseApiError(err)),
  })
}

export function useDeleteBrand() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => brandService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.brands() })
      toast.success('Marca excluída.')
    },
    onError: (err) => toast.error(parseApiError(err)),
  })
}

// ── Pillars ───────────────────────────────────────────────────────────────────

export function usePillars(brandId: number) {
  return useQuery({
    queryKey: queryKeys.pillars(brandId),
    queryFn:  () => pillarService.listByBrand(brandId),
    enabled:  !!brandId,
  })
}

export function useCreatePillar(brandId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreatePillarPayload) => pillarService.create(brandId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pillars(brandId) })
      qc.invalidateQueries({ queryKey: queryKeys.brands() })
      toast.success('Pilar criado.')
    },
    onError: (err) => toast.error(parseApiError(err)),
  })
}

export function useUpdatePillar(pillarId: number, brandId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdatePillarPayload) => pillarService.update(pillarId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pillars(brandId) })
      toast.success('Pilar atualizado.')
    },
    onError: (err) => toast.error(parseApiError(err)),
  })
}

export function useDeletePillar(brandId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (pillarId: number) => pillarService.delete(pillarId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pillars(brandId) })
      qc.invalidateQueries({ queryKey: queryKeys.brands() })
      toast.success('Pilar excluído.')
    },
    onError: (err) => toast.error(parseApiError(err)),
  })
}
