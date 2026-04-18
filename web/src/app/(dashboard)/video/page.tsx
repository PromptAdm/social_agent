'use client'

import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, RotateCcw } from 'lucide-react'
import { UploadZone }     from '@/components/video/UploadZone'
import { ProcessingView } from '@/components/video/ProcessingView'
import { SegmentEditor }  from '@/components/video/SegmentEditor'
import { DownloadPanel }  from '@/components/video/DownloadPanel'
import { videoSubtitleService, type SubtitleSegment } from '@/services/videoSubtitleService'
import { useInvalidateCredits } from '@/hooks/useCredits'

// ── Polling interval logic ─────────────────────────────────────────────────────

function shouldPoll(phase: string) {
  return phase === 'transcribing' || phase === 'rendering'
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function VideoPage() {
  const [projectId, setProjectId] = useState<number | null>(null)
  const invalidateCredits = useInvalidateCredits()
  const qc = useQueryClient()

  // Poll while in an active processing phase
  const { data: status, isLoading, error } = useQuery({
    queryKey:       ['video-subtitle', projectId],
    queryFn:        () => videoSubtitleService.getStatus(projectId!),
    enabled:        projectId !== null,
    refetchInterval: (query) =>
      shouldPoll(query.state.data?.phase ?? '') ? 2000 : false,
  })

  const handleProjectCreated = useCallback((id: number) => {
    setProjectId(id)
    invalidateCredits()
  }, [invalidateCredits])

  const handleSegmentsSaved = useCallback((newSegs: SubtitleSegment[]) => {
    qc.invalidateQueries({ queryKey: ['video-subtitle', projectId] })
  }, [qc, projectId])

  const handleRenderStarted = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['video-subtitle', projectId] })
  }, [qc, projectId])

  const handleNewProject = useCallback(() => {
    setProjectId(null)
    qc.removeQueries({ queryKey: ['video-subtitle'] })
  }, [qc])

  // ── Derivar fase atual ───────────────────────────────────────────────────────
  const phase = status?.phase ?? (projectId ? 'transcribing' : 'upload')

  // ── Loading skeleton enquanto carrega status pela primeira vez ───────────────
  if (projectId && isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── Erro ao buscar status ────────────────────────────────────────────────────
  if (projectId && error && !status) {
    return (
      <div className="max-w-lg mx-auto px-6 py-16 flex flex-col items-center gap-4 text-center">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <h2 className="text-[18px] font-semibold text-slate-900">Erro ao carregar projeto</h2>
        <p className="text-[14px] text-slate-500">
          Não foi possível buscar o status do projeto. Verifique sua conexão e tente novamente.
        </p>
        <button
          onClick={handleNewProject}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-[13px] font-medium text-slate-400 hover:text-slate-700 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Voltar ao início
        </button>
      </div>
    )
  }

  // ── Step: Upload (nenhum projeto ativo) ───────────────────────────────────────
  if (!projectId || phase === 'upload' || phase === 'pending') {
    return <UploadZone onProjectCreated={handleProjectCreated} />
  }

  // ── Step: Transcribing ────────────────────────────────────────────────────────
  if (phase === 'transcribing') {
    return <ProcessingView phase="transcribing" />
  }

  // ── Step: Review segments ─────────────────────────────────────────────────────
  if (phase === 'transcribed' && status?.segments) {
    return (
      <SegmentEditor
        projectId={projectId}
        segments={status.segments}
        ffmpegAvail={status.ffmpeg_available}
        onSaved={handleSegmentsSaved}
        onRender={handleRenderStarted}
      />
    )
  }

  // ── Step: Rendering ───────────────────────────────────────────────────────────
  if (phase === 'rendering') {
    return <ProcessingView phase="rendering" />
  }

  // ── Step: Completed ───────────────────────────────────────────────────────────
  if (phase === 'completed' && status) {
    return (
      <DownloadPanel
        status={status}
        onNewProject={handleNewProject}
      />
    )
  }

  // ── Step: Failed ──────────────────────────────────────────────────────────────
  if (phase === 'failed') {
    return (
      <div className="max-w-lg mx-auto px-6 py-16 flex flex-col items-center gap-5 text-center">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <div>
          <h2 className="text-[20px] font-semibold text-slate-900 mb-2">Processamento falhou</h2>
          {status?.project.error_message && (
            <p className="text-[13px] text-red-400/80 bg-red-500/8 border border-red-500/15 rounded-xl px-4 py-3 text-left leading-relaxed">
              {status.project.error_message}
            </p>
          )}
        </div>
        <button
          onClick={handleNewProject}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-100 border border-slate-300 text-[14px] font-medium text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Tentar com outro vídeo
        </button>
      </div>
    )
  }

  // ── Fallback (transcribed sem segments — estado transitório) ──────────────────
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
