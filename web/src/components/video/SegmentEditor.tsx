'use client'

import { useCallback, useState } from 'react'
import { Save, RotateCcw, Film, AlertCircle, CheckCircle2, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { SubtitleSegment } from '@/services/videoSubtitleService'
import { videoSubtitleService } from '@/services/videoSubtitleService'
import { toast } from '@/store/uiStore'

interface SegmentEditorProps {
  projectId:   number
  segments:    SubtitleSegment[]
  ffmpegAvail: boolean
  onSaved:     (newSegments: SubtitleSegment[]) => void
  onRender:    () => void
}

function _fmt(sec: number): string {
  const m  = Math.floor(sec / 60)
  const s  = Math.floor(sec % 60)
  const ms = Math.round((sec % 1) * 100)
  return `${m}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`
}

export function SegmentEditor({
  projectId,
  segments: initialSegments,
  ffmpegAvail,
  onSaved,
  onRender,
}: SegmentEditorProps) {
  const [segments,   setSegments]   = useState<SubtitleSegment[]>(initialSegments)
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editText,   setEditText]   = useState('')
  const [isSaving,   setIsSaving]   = useState(false)
  const [isRendering, setIsRendering] = useState(false)
  const [dirty,      setDirty]      = useState(false)

  const startEdit = (idx: number) => {
    setEditingIdx(idx)
    setEditText(segments[idx].text)
  }

  const commitEdit = () => {
    if (editingIdx === null) return
    setSegments((prev) =>
      prev.map((s, i) => (i === editingIdx ? { ...s, text: editText.trim() || s.text } : s)),
    )
    setEditingIdx(null)
    setDirty(true)
  }

  const cancelEdit = useCallback(() => setEditingIdx(null), [])

  const deleteSegment = (idx: number) => {
    setSegments((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, index: i + 1 })))
    setDirty(true)
  }

  const addSegmentAfter = (idx: number) => {
    const prev   = segments[idx]
    const next   = segments[idx + 1]
    const start  = prev.end
    const end    = next ? (prev.end + next.start) / 2 : prev.end + 2
    const newSeg: SubtitleSegment = { index: 0, start, end, text: '' }
    const updated = [
      ...segments.slice(0, idx + 1),
      newSeg,
      ...segments.slice(idx + 1),
    ].map((s, i) => ({ ...s, index: i + 1 }))
    setSegments(updated)
    setDirty(true)
    // Enter edit mode for new segment
    setTimeout(() => {
      setEditingIdx(idx + 1)
      setEditText('')
    }, 0)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const updated = await videoSubtitleService.updateSegments(projectId, segments)
      const newSegs = updated.segments ?? segments
      setSegments(newSegs)
      setDirty(false)
      onSaved(newSegs)
      toast.success('Segmentos salvos.')
    } catch {
      toast.error('Erro ao salvar segmentos.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRender = async () => {
    if (dirty) {
      await handleSave()
    }
    setIsRendering(true)
    try {
      await videoSubtitleService.startRender(projectId)
      onRender()
    } catch {
      toast.error('Erro ao iniciar renderização.')
      setIsRendering(false)
    }
  }

  const handleReset = () => {
    setSegments(initialSegments)
    setDirty(false)
    setEditingIdx(null)
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-[18px] font-semibold text-slate-100">Revise as legendas</h2>
          <p className="text-[13px] text-slate-500 mt-1">
            Clique em qualquer bloco para editar o texto. Salve antes de gerar o vídeo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] text-slate-500 hover:text-slate-300 hover:bg-[#17171F] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Desfazer
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!dirty || isSaving}
            className={cn(
              'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[13px] font-medium transition-all',
              dirty
                ? 'bg-[#17171F] border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/10'
                : 'bg-[#17171F] border border-[#27273A] text-slate-600 cursor-not-allowed',
            )}
          >
            {isSaving ? (
              <div className="w-3.5 h-3.5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Salvar
          </button>
        </div>
      </div>

      {/* Segments list */}
      <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
        {segments.map((seg, idx) => (
          <div key={seg.index} className="group">
            {editingIdx === idx ? (
              /* Editing mode */
              <div className="bg-indigo-600/8 border border-indigo-500/30 rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                    {_fmt(seg.start)} → {_fmt(seg.end)}
                  </span>
                  <span className="text-[11px] text-indigo-400">#{seg.index}</span>
                </div>
                <textarea
                  autoFocus
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit() }
                    if (e.key === 'Escape') cancelEdit()
                  }}
                  rows={2}
                  className="w-full bg-transparent text-[14px] text-slate-100 resize-none outline-none leading-relaxed"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[11px] text-indigo-500/70">Enter para confirmar · Esc para cancelar</span>
                  <div className="flex gap-2">
                    <button
                      onClick={cancelEdit}
                      className="px-2.5 py-1 rounded-lg text-[12px] text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={commitEdit}
                      className="px-2.5 py-1 rounded-lg text-[12px] font-medium bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 transition-colors"
                    >
                      Confirmar
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* View mode */
              <div
                className="flex items-start gap-3 px-4 py-3 bg-[#0F0F17] border border-[#1E1E2A] hover:border-[#2A2A38] rounded-xl cursor-pointer transition-all group"
                onClick={() => startEdit(idx)}
              >
                <span className="text-[10px] font-bold text-slate-700 mt-0.5 w-5 flex-shrink-0 text-right">
                  {seg.index}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-slate-300 leading-relaxed">
                    {seg.text || <span className="text-slate-700 italic">Texto vazio</span>}
                  </p>
                  <p className="text-[11px] text-slate-700 mt-0.5">
                    {_fmt(seg.start)} → {_fmt(seg.end)}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); addSegmentAfter(idx) }}
                    className="p-1 rounded text-slate-700 hover:text-indigo-400 hover:bg-indigo-600/10 transition-colors"
                    title="Inserir segmento após"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSegment(idx) }}
                    className="p-1 rounded text-slate-700 hover:text-red-400 hover:bg-red-500/8 transition-colors"
                    title="Excluir segmento"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Count */}
      <p className="text-[12px] text-slate-600 text-center">
        {segments.length} segmento{segments.length !== 1 ? 's' : ''}
        {dirty && <span className="text-amber-500/70 ml-2">· Alterações não salvas</span>}
      </p>

      {/* FFmpeg warning */}
      {!ffmpegAvail && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-500/8 border border-amber-500/20 rounded-xl text-[13px] text-amber-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            FFmpeg não detectado no servidor. O vídeo renderizado não estará disponível,
            mas você poderá baixar o arquivo SRT para usar em qualquer editor de vídeo.
          </span>
        </div>
      )}

      {/* Render CTA */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleRender}
          disabled={isRendering}
          className={cn(
            'flex-1 h-12 rounded-xl text-[15px] font-semibold transition-all flex items-center justify-center gap-2',
            !isRendering
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 hover:-translate-y-0.5'
              : 'bg-[#17171F] text-slate-600 border border-[#27273A] cursor-not-allowed',
          )}
        >
          {isRendering ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Iniciando renderização...
            </>
          ) : (
            <>
              <Film className="w-4 h-4" />
              {ffmpegAvail ? 'Gerar vídeo com legendas' : 'Gerar arquivo SRT'}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
