import { CheckCircle2, Download, FileText, Video, RotateCcw, AlertTriangle } from 'lucide-react'
import type { VideoSubtitleStatus } from '@/services/videoSubtitleService'
import { videoSubtitleService } from '@/services/videoSubtitleService'
import { cn } from '@/lib/utils/cn'

interface DownloadPanelProps {
  status:         VideoSubtitleStatus
  onNewProject:   () => void
}

export function DownloadPanel({ status, onNewProject }: DownloadPanelProps) {
  const hasVideo = !!status.video_url
  const hasSrt   = !!status.srt_url
  const srtApiUrl = videoSubtitleService.getSrtDownloadUrl(status.project.id)

  const openDownload = (url: string, filename: string) => {
    const a = document.createElement('a')
    a.href     = url
    a.download = filename
    a.target   = '_blank'
    a.rel      = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-12 space-y-8 text-center">

      {/* Success icon */}
      <div className="flex justify-center">
        <div className="relative">
          <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Title */}
      <div>
        <h2 className="text-[22px] font-semibold text-slate-100 mb-2">
          {hasVideo ? 'Vídeo pronto!' : 'Legendas prontas!'}
        </h2>
        <p className="text-[14px] text-slate-500">
          {status.project.title ?? status.project.input_file_name ?? 'Vídeo processado'}
        </p>
        {status.project.error_message && (
          <div className="flex items-start gap-2 mt-3 px-4 py-3 bg-amber-500/8 border border-amber-500/20 rounded-xl text-[13px] text-amber-400 text-left">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{status.project.error_message}</span>
          </div>
        )}
      </div>

      {/* Download buttons */}
      <div className="space-y-3">
        {hasVideo && status.video_url && (
          <button
            onClick={() => openDownload(status.video_url!, `video_legendado_${status.project.id}.mp4`)}
            className="w-full flex items-center gap-3 px-5 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/25 hover:-translate-y-0.5"
          >
            <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
              <Video className="w-4.5 h-4.5" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[14px] font-semibold">Baixar vídeo com legendas</p>
              <p className="text-[11px] text-indigo-200/70">MP4 com legendas embutidas (hard-coded)</p>
            </div>
            <Download className="w-4 h-4 opacity-70 flex-shrink-0" />
          </button>
        )}

        {hasSrt && (
          <button
            onClick={() => openDownload(srtApiUrl, `legendas_${status.project.id}.srt`)}
            className={cn(
              'w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all border',
              hasVideo
                ? 'bg-[#0F0F17] border-[#1E1E2A] hover:border-[#2A2A38] text-slate-300 hover:text-slate-100'
                : 'bg-emerald-500/8 border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/12',
            )}
          >
            <div className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
              hasVideo ? 'bg-[#17171F] border border-[#27273A]' : 'bg-emerald-500/15',
            )}>
              <FileText className="w-4 h-4" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[14px] font-semibold">Baixar arquivo SRT</p>
              <p className={cn('text-[11px]', hasVideo ? 'text-slate-600' : 'text-emerald-400/60')}>
                Compatível com YouTube, DaVinci Resolve, Premiere e outros
              </p>
            </div>
            <Download className="w-4 h-4 opacity-50 flex-shrink-0" />
          </button>
        )}

        {!hasVideo && !hasSrt && (
          <div className="px-4 py-3 bg-amber-500/8 border border-amber-500/20 rounded-xl text-[13px] text-amber-400">
            Nenhum arquivo disponível para download. O processamento pode ter falhado.
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { label: 'Idioma',    value: status.project.language.toUpperCase() },
          { label: 'Créditos',  value: `${status.project.credits_cost}` },
          { label: 'Segmentos', value: status.segments ? String(status.segments.length) : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[#0F0F17] border border-[#1E1E2A] rounded-xl py-3 px-2">
            <p className="text-[18px] font-bold text-slate-100">{value}</p>
            <p className="text-[11px] text-slate-600 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* New project */}
      <button
        onClick={onNewProject}
        className="flex items-center gap-2 mx-auto px-5 py-2.5 rounded-xl border border-[#27273A] text-[13px] font-medium text-slate-400 hover:text-slate-200 hover:border-[#3A3A50] transition-all"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Novo vídeo
      </button>
    </div>
  )
}
