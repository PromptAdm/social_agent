'use client'

import { useState } from 'react'
import { Download, Sparkles, Info, CheckCircle2, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { ImageFamily, FamilyImage } from '@/services/imageTreeService'

interface FamilyCardProps {
  family:     ImageFamily
  isSelected: boolean
  onSelect:   () => void
  onRefine:   () => void
  onDownload: (url: string, familyName: string, idx: number) => void
}

const VARIANT_LABELS = ['Principal', 'Variação A', 'Variação B', 'Variação C']

export function FamilyCard({ family, isSelected, onSelect, onRefine, onDownload }: FamilyCardProps) {
  const [hoveredIdx,    setHoveredIdx]    = useState<number | null>(null)
  const [selectedImage, setSelectedImage] = useState<FamilyImage | null>(null)
  const [showPrompt,    setShowPrompt]    = useState<number | null>(null)

  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ?? 'http://localhost:8000'
  const fullUrl = (fileUrl: string) =>
    fileUrl.startsWith('http') ? fileUrl : `${apiBase}${fileUrl}`

  return (
    <div className="bg-[#0D0D14] border-t border-[#1E1E2A] overflow-hidden">

      {/* 2×2 image grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[#151520]">
        {family.images.map((img, idx) => (
          <div
            key={idx}
            className="relative aspect-square group cursor-pointer overflow-hidden"
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
            onClick={() => setSelectedImage(selectedImage?.variant_index === idx ? null : img)}
          >
            <img
              src={fullUrl(img.file_url)}
              alt={`${family.family_name} — ${VARIANT_LABELS[idx % 4]}`}
              className="w-full h-full object-cover transition-all duration-300 group-hover:scale-[1.04]"
              loading="lazy"
            />

            {/* Gradient overlay always present, darkens on hover */}
            <div className={cn(
              'absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent transition-opacity duration-200',
              hoveredIdx === idx ? 'opacity-100' : 'opacity-0',
            )} />

            {/* Hover controls */}
            <div className={cn(
              'absolute inset-0 flex flex-col items-center justify-end pb-3 gap-1 transition-opacity duration-200',
              hoveredIdx === idx ? 'opacity-100' : 'opacity-0',
            )}>
              <span className="text-[10px] font-semibold text-white/80 px-2 text-center leading-tight">
                {VARIANT_LABELS[idx % 4]}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); onDownload(fullUrl(img.file_url), family.family_name, idx) }}
                  className="p-1.5 rounded-lg bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-colors"
                  title="Download"
                >
                  <Download className="w-3.5 h-3.5 text-white" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowPrompt(showPrompt === idx ? null : idx) }}
                  className="p-1.5 rounded-lg bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-colors"
                  title="Ver prompt"
                >
                  <Info className="w-3.5 h-3.5 text-white" />
                </button>
                <a
                  href={fullUrl(img.file_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-lg bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-colors"
                  title="Abrir em nova aba"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-white" />
                </a>
              </div>
            </div>

            {/* Selected ring */}
            {selectedImage?.variant_index === idx && (
              <div className="absolute inset-0 ring-2 ring-indigo-500 ring-inset pointer-events-none" />
            )}
            {selectedImage?.variant_index === idx && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center shadow-md">
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Prompt reveal */}
      {showPrompt !== null && family.images[showPrompt] && (
        <div className="px-4 py-3 bg-[#09090E] border-t border-[#1A1A24]">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-700 mb-1.5">
            Prompt — {VARIANT_LABELS[showPrompt % 4]}
          </p>
          <p className="text-[12px] text-slate-400 leading-relaxed">
            {family.images[showPrompt].prompt_used}
          </p>
        </div>
      )}

      {/* Selected image row */}
      {selectedImage && (
        <div className="px-4 py-3 bg-indigo-600/6 border-t border-indigo-500/12">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <span className="text-[13px] text-indigo-300 font-medium leading-tight">
                {family.family_name} — {VARIANT_LABELS[selectedImage.variant_index % 4]}
              </span>
            </div>
            <button
              onClick={() => onDownload(
                fullUrl(selectedImage.file_url),
                family.family_name,
                selectedImage.variant_index,
              )}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/18 hover:bg-indigo-600/28 text-indigo-300 text-[12px] font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar
            </button>
          </div>
        </div>
      )}

      {/* Actions footer */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-[#17171F]">
        <button
          onClick={onSelect}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all',
            isSelected
              ? 'bg-indigo-600/18 text-indigo-300 border border-indigo-500/25'
              : 'bg-[#13131A] text-slate-500 border border-[#1E1E2A] hover:text-slate-300 hover:border-[#2E2E3E]',
          )}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          {isSelected ? 'Selecionada' : 'Selecionar família'}
        </button>

        <button
          onClick={onRefine}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#13131A] border border-[#1E1E2A] text-[12px] font-medium text-slate-500 hover:text-violet-300 hover:border-violet-500/25 hover:bg-violet-600/8 transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Refinar
        </button>
      </div>
    </div>
  )
}
