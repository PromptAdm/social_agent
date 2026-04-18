'use client'

import { useEffect, useRef, useState } from 'react'
import { Sparkles, X, ChevronRight, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { ImageFamily } from '@/services/imageTreeService'

const QUICK_DIRECTIONS = [
  'Mais escuro e dramático',
  'Mais claro e minimalista',
  'Cores mais vibrantes',
  'Tom mais elegante e premium',
  'Composição mais dinâmica',
  'Versão com menos elementos',
]

interface RefinementModalProps {
  family:     ImageFamily
  isLoading:  boolean
  onConfirm:  (instruction: string) => void
  onClose:    () => void
}

export function RefinementModal({ family, isLoading, onConfirm, onClose }: RefinementModalProps) {
  const [instruction, setInstruction] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isLoading, onClose])

  const handleConfirm = () => {
    const text = instruction.trim()
    if (!text) return
    onConfirm(text)
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-6"
      onClick={(e) => { if (e.target === e.currentTarget && !isLoading) onClose() }}
    >
      <div className="w-full max-w-lg bg-[#0F0F17] border border-[#27273A] rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E1E2A]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-violet-600/15 border border-violet-500/20 rounded-xl flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-slate-100">Refinar família</p>
              <p className="text-[12px] text-slate-600 truncate max-w-[220px]">{family.family_name}</p>
            </div>
          </div>
          {!isLoading && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Quick directions */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                Sugestões rápidas
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_DIRECTIONS.map((dir) => (
                <button
                  key={dir}
                  onClick={() => setInstruction(dir)}
                  disabled={isLoading}
                  className={cn(
                    'px-2.5 py-1 rounded-lg border text-[12px] transition-all',
                    instruction === dir
                      ? 'bg-violet-600/15 border-violet-500/30 text-violet-300'
                      : 'bg-[#17171F] border-[#27273A] text-slate-500 hover:text-slate-300 hover:border-[#3A3A50]',
                  )}
                >
                  {dir}
                </button>
              ))}
            </div>
          </div>

          {/* Custom instruction */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
              Instrução personalizada
            </label>
            <textarea
              ref={textareaRef}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleConfirm() }
              }}
              placeholder="Ex: mais escuro, composição mais dinâmica, cores da marca..."
              rows={3}
              disabled={isLoading}
              className="w-full bg-[#0A0A10] border border-[#1E1E2A] focus:border-violet-500/40 rounded-xl px-4 py-3 text-[13px] text-slate-200 placeholder:text-slate-700 outline-none resize-none transition-colors leading-relaxed disabled:opacity-50"
            />
            <p className="text-[11px] text-slate-700">Enter para confirmar · Esc para cancelar</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 py-4 border-t border-[#1E1E2A]">
          {!isLoading && (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-[13px] text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
          )}
          <button
            onClick={handleConfirm}
            disabled={!instruction.trim() || isLoading}
            className={cn(
              'flex-1 h-10 rounded-xl text-[14px] font-semibold transition-all flex items-center justify-center gap-2',
              instruction.trim() && !isLoading
                ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/20'
                : 'bg-[#17171F] text-slate-600 border border-[#27273A] cursor-not-allowed',
            )}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Gerando variação...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Gerar variação
                <ChevronRight className="w-4 h-4 opacity-60" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
