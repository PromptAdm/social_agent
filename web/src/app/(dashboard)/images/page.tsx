'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { AlertCircle, RotateCcw } from 'lucide-react'
import { StudioForm }     from '@/components/images/StudioForm'
import { GeneratingView } from '@/components/images/GeneratingView'
import { FamilyGrid }     from '@/components/images/FamilyGrid'
import { imageTreeService, type ImageFamily } from '@/services/imageTreeService'
import { useInvalidateCredits } from '@/hooks/useCredits'

// ── Polling ───────────────────────────────────────────────────────────────────

function shouldPoll(phase: string) {
  return phase === 'generating' || phase === 'pending'
}

// ── searchParams bridge: isolated so Suspense can catch it ────────────────────

function SearchParamsBridge({ onParam }: { onParam: (id: number) => void }) {
  const searchParams = useSearchParams()
  useEffect(() => {
    const p = searchParams.get('project')
    if (p) onParam(Number(p))
  }, [searchParams, onParam])
  return null
}

// ── Core page logic ───────────────────────────────────────────────────────────

function ImagesPageInner() {
  const [projectId, setProjectId] = useState<number | null>(null)
  const invalidateCredits = useInvalidateCredits()
  const qc = useQueryClient()

  const { data: status, isLoading, error } = useQuery({
    queryKey:        ['image-tree', projectId],
    queryFn:         () => imageTreeService.getStatus(projectId!),
    enabled:         projectId !== null,
    refetchInterval: (query) =>
      shouldPoll(query.state.data?.phase ?? '') ? 2000 : false,
  })

  const handleProjectCreated = useCallback((id: number) => {
    setProjectId(id)
    invalidateCredits()
  }, [invalidateCredits])

  const handleFamiliesUpdated = useCallback((updated: ImageFamily[]) => {
    if (!status) return
    qc.setQueryData(['image-tree', projectId], { ...status, families: updated })
  }, [qc, projectId, status])

  const handleNewProject = useCallback(() => {
    setProjectId(null)
    qc.removeQueries({ queryKey: ['image-tree'] })
  }, [qc])

  // Reads ?project=<id> from URL and initialises projectId on mount
  const handleParam = useCallback((id: number) => {
    setProjectId((prev) => prev ?? id)
  }, [])

  const phase = status?.phase ?? (projectId ? 'generating' : 'studio')

  if (projectId && isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (projectId && error && !status) {
    return (
      <div className="max-w-lg mx-auto px-6 py-16 flex flex-col items-center gap-4 text-center">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <h2 className="text-[18px] font-semibold text-slate-100">Erro ao carregar projeto</h2>
        <p className="text-[14px] text-slate-500">
          Não foi possível buscar o status do projeto. Verifique sua conexão e tente novamente.
        </p>
        <button
          onClick={handleNewProject}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#27273A] text-[13px] font-medium text-slate-400 hover:text-slate-200 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Voltar ao início
        </button>
      </div>
    )
  }

  return (
    <>
      {/* Reads URL param inside Suspense — no visual output */}
      <Suspense>
        <SearchParamsBridge onParam={handleParam} />
      </Suspense>

      {(!projectId || phase === 'studio') && (
        <StudioForm onProjectCreated={handleProjectCreated} />
      )}

      {projectId && (phase === 'generating' || phase === 'pending') && (
        <GeneratingView />
      )}

      {projectId && phase === 'completed' && status?.families && (
        <FamilyGrid
          projectId={projectId}
          families={status.families}
          project={status.project}
          onNewProject={handleNewProject}
          onFamiliesUpdated={handleFamiliesUpdated}
        />
      )}

      {projectId && phase === 'failed' && (
        <div className="max-w-lg mx-auto px-6 py-16 flex flex-col items-center gap-5 text-center">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <div>
            <h2 className="text-[20px] font-semibold text-slate-100 mb-2">Geração falhou</h2>
            {status?.project.error_message && (
              <p className="text-[13px] text-red-400/80 bg-red-500/8 border border-red-500/15 rounded-xl px-4 py-3 text-left leading-relaxed">
                {status.project.error_message}
              </p>
            )}
          </div>
          <button
            onClick={handleNewProject}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#17171F] border border-[#27273A] text-[14px] font-medium text-slate-300 hover:text-slate-100 hover:border-[#3A3A50] transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Tentar com outra direção
          </button>
        </div>
      )}

      {/* Fallback transitório */}
      {projectId && !['generating','pending','completed','failed','studio'].includes(phase) && (
        <div className="flex items-center justify-center h-64">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </>
  )
}

// ── Page export ───────────────────────────────────────────────────────────────

export default function ImagesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ImagesPageInner />
    </Suspense>
  )
}
