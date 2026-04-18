'use client'

import { useCallback, useRef, useState } from 'react'
import { Upload, Video, X, AlertCircle, Zap } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { videoSubtitleService } from '@/services/videoSubtitleService'
import { useCredits } from '@/hooks/useCredits'
import { ops } from '@/store/operationsStore'
import { toast } from '@/store/uiStore'

const LANGUAGES = [
  { code: 'pt',   label: 'Português' },
  { code: 'en',   label: 'English' },
  { code: 'es',   label: 'Español' },
  { code: 'fr',   label: 'Français' },
  { code: 'de',   label: 'Deutsch' },
  { code: 'auto', label: 'Detecção automática' },
]

const CREDIT_COST = 20  // deve bater com settings.CREDITS_VIDEO_SUBTITLE

interface UploadZoneProps {
  onProjectCreated: (projectId: number) => void
}

export function UploadZone({ onProjectCreated }: UploadZoneProps) {
  const [file,       setFile]       = useState<File | null>(null)
  const [language,   setLanguage]   = useState('pt')
  const [isDragging, setIsDragging] = useState(false)
  const [uploading,  setUploading]  = useState(false)
  const [progress,   setProgress]   = useState(0)
  const [error,      setError]      = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: credits } = useCredits()
  const canAfford = !credits || credits.balance >= CREDIT_COST

  const handleFile = useCallback((f: File) => {
    const allowed = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/mpeg']
    if (!allowed.includes(f.type)) {
      setError('Formato não suportado. Use MP4, MOV, AVI ou WebM.')
      return
    }
    if (f.size > 500 * 1024 * 1024) {
      setError('Arquivo muito grande. Limite: 500 MB.')
      return
    }
    setError(null)
    setFile(f)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const handleStart = async () => {
    if (!file || uploading) return
    setUploading(true)
    setError(null)
    ops.start('video-upload', 'upload', `Enviando: ${file.name}`)

    try {
      const result = await videoSubtitleService.create({
        file,
        language,
        onProgress: (pct) => {
          setProgress(pct)
          ops.progress('video-upload', pct)
        },
      })
      ops.complete('video-upload', 'Upload concluído, transcrevendo...')
      onProjectCreated(result.project_id)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail ?? 'Erro ao enviar vídeo.'
      setError(msg)
      ops.fail('video-upload', msg)
      toast.error(msg)
    } finally {
      setUploading(false)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-[20px] font-semibold text-slate-900">Legendar Vídeo</h1>
        <p className="text-[13px] text-slate-500 mt-1">
          Envie um vídeo, transcreva a fala e exporte com legendas embutidas.
        </p>
      </div>

      {/* Credits info */}
      <div className={cn(
        'flex items-center gap-2.5 px-4 py-3 rounded-xl border text-[13px]',
        canAfford
          ? 'bg-indigo-600/5 border-indigo-500/20 text-slate-400'
          : 'bg-red-500/8 border-red-500/20 text-red-400',
      )}>
        <Zap className={cn('w-4 h-4 flex-shrink-0', canAfford ? 'text-indigo-400' : 'text-red-400')} />
        <span>
          Custo: <strong className="text-slate-700">{CREDIT_COST} créditos</strong> por vídeo.
          {credits && (
            <> Saldo atual: <strong className={canAfford ? 'text-slate-700' : 'text-red-300'}>{credits.balance} créditos</strong>.</>
          )}
        </span>
      </div>

      {/* Drop zone */}
      {!file ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'relative border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all',
            isDragging
              ? 'border-indigo-500/60 bg-indigo-600/8'
              : 'border-slate-300 hover:border-slate-300 hover:bg-slate-50',
          )}
        >
          <div className="w-14 h-14 bg-slate-100 border border-slate-300 rounded-2xl flex items-center justify-center">
            <Upload className="w-6 h-6 text-slate-500" />
          </div>
          <div className="text-center">
            <p className="text-[15px] font-medium text-slate-600 mb-1">
              Arraste o vídeo aqui
            </p>
            <p className="text-[13px] text-slate-600">
              ou <span className="text-indigo-400">clique para selecionar</span>
            </p>
            <p className="text-[12px] text-slate-700 mt-2">
              MP4, MOV, AVI, WebM · Máximo 500 MB
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/x-msvideo,video/webm,video/mpeg"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>
      ) : (
        /* File selected card */
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600/12 border border-indigo-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Video className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-medium text-slate-700 truncate">{file.name}</p>
            <p className="text-[12px] text-slate-600">{formatSize(file.size)}</p>
          </div>
          {!uploading && (
            <button
              onClick={() => setFile(null)}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-red-500/8 border border-red-500/20 rounded-xl text-[13px] text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Language selector */}
      {file && (
        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
            Idioma do vídeo
          </label>
          <div className="grid grid-cols-3 gap-2">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => setLanguage(l.code)}
                className={cn(
                  'px-3 py-2 rounded-xl border text-[13px] font-medium transition-all',
                  language === l.code
                    ? 'bg-indigo-600/15 border-indigo-500/30 text-indigo-300'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700',
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-[12px] text-slate-500">
            <span>Enviando vídeo...</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* CTA */}
      <button
        onClick={handleStart}
        disabled={!file || uploading || !canAfford}
        className={cn(
          'w-full h-12 rounded-xl text-[15px] font-semibold transition-all flex items-center justify-center gap-2',
          file && canAfford && !uploading
            ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 hover:-translate-y-0.5'
            : 'bg-slate-100 text-slate-600 cursor-not-allowed border border-slate-300',
        )}
      >
        {uploading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Enviando... {progress}%
          </>
        ) : (
          <>
            <Zap className="w-4 h-4" />
            Gerar legendas — {CREDIT_COST} créditos
          </>
        )}
      </button>
    </div>
  )
}
