'use client'

import { useState } from 'react'
import { RotateCcw, Sparkles, Download, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { FamilyCard } from '@/components/images/FamilyCard'
import { RefinementModal } from '@/components/images/RefinementModal'
import type { ImageFamily, ImageProject } from '@/services/imageTreeService'
import { imageTreeService } from '@/services/imageTreeService'
import { toast } from '@/store/uiStore'

interface FamilyGridProps {
  projectId:          number
  families:           ImageFamily[]
  project:            ImageProject
  onNewProject:       () => void
  onFamiliesUpdated:  (updated: ImageFamily[]) => void
}

export function FamilyGrid({
  projectId,
  families,
  project,
  onNewProject,
  onFamiliesUpdated,
}: FamilyGridProps) {
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null)
  const [refineTarget,     setRefineTarget]     = useState<ImageFamily | null>(null)
  const [isRefining,       setIsRefining]       = useState(false)
  const [expandedFamily,   setExpandedFamily]   = useState<string | null>(
    families[0]?.family_id ?? null,
  )

  const direction = imageTreeService.parseDirection(project.input_prompt)

  const handleRefine = async (family: ImageFamily, instruction: string) => {
    setIsRefining(true)
    try {
      const updated = await imageTreeService.refineFamily(projectId, family.family_id, instruction)
      if (updated.families) {
        onFamiliesUpdated(updated.families)
        toast.success('Nova variação adicionada à árvore.')
      }
    } catch {
      toast.error('Erro ao refinar família. Tente novamente.')
    } finally {
      setIsRefining(false)
      setRefineTarget(null)
    }
  }

  const handleDownloadImage = (url: string, familyName: string, idx: number) => {
    const a = document.createElement('a')
    a.href     = url
    a.download = `${familyName.replace(/\s+/g, '_')}_${idx + 1}.svg`
    a.target   = '_blank'
    a.rel      = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // Split original vs refinements
  const originalFamilies  = families.filter((f) => !f.refined_from)
  const refinedFamilies   = families.filter((f) => !!f.refined_from)

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-[18px] font-semibold text-slate-100">
            {project.title ?? 'Famílias Visuais'}
          </h2>
          <p className="text-[13px] text-slate-500 mt-1">
            {families.length} família{families.length !== 1 ? 's' : ''} gerada{families.length !== 1 ? 's' : ''}.
            {direction && (
              <span className="ml-1.5 text-slate-600">
                Estilo: {direction.style} · Tom: {direction.tone} · Modo: {direction.mode}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={onNewProject}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#27273A] text-[13px] font-medium text-slate-400 hover:text-slate-200 hover:border-[#3A3A50] transition-all flex-shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Novo projeto
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Famílias',   value: String(originalFamilies.length) },
          { label: 'Variações',  value: String(families.reduce((acc, f) => acc + f.images.length, 0)) },
          { label: 'Créditos',   value: String(project.credits_cost) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[#0F0F17] border border-[#1E1E2A] rounded-xl py-3 px-4 text-center">
            <p className="text-[20px] font-bold text-slate-100">{value}</p>
            <p className="text-[11px] text-slate-600 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Original families */}
      <div className="space-y-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
          Famílias geradas
        </p>
        {originalFamilies.map((family, idx) => (
          <div key={family.family_id} className="space-y-0">
            {/* Family header / toggle */}
            <button
              onClick={() =>
                setExpandedFamily(
                  expandedFamily === family.family_id ? null : family.family_id,
                )
              }
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3.5 rounded-t-2xl border border-b-0 text-left transition-all',
                expandedFamily === family.family_id
                  ? 'bg-[#0F0F17] border-[#1E1E2A]'
                  : 'bg-[#0A0A10] border-[#1A1A25] hover:border-[#27273A] rounded-b-2xl border-b',
              )}
            >
              <div className="w-7 h-7 rounded-lg bg-indigo-600/15 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-[12px] font-bold text-indigo-400">{idx + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-slate-200 truncate">{family.family_name}</p>
                <p className="text-[12px] text-slate-600 truncate">{family.description}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[11px] text-slate-700">{family.images.length} imagens</span>
                {expandedFamily === family.family_id ? (
                  <ChevronUp className="w-4 h-4 text-slate-600" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-600" />
                )}
              </div>
            </button>

            {/* Expanded family card */}
            {expandedFamily === family.family_id && (
              <FamilyCard
                family={family}
                isSelected={selectedFamilyId === family.family_id}
                onSelect={() =>
                  setSelectedFamilyId(
                    selectedFamilyId === family.family_id ? null : family.family_id,
                  )
                }
                onRefine={() => setRefineTarget(family)}
                onDownload={handleDownloadImage}
              />
            )}
          </div>
        ))}
      </div>

      {/* Refined families */}
      {refinedFamilies.length > 0 && (
        <div className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
            Variações refinadas
          </p>
          {refinedFamilies.map((family) => {
            const origin = originalFamilies.find((f) => f.family_id === family.refined_from)
            return (
              <div key={family.family_id} className="space-y-0">
                <button
                  onClick={() =>
                    setExpandedFamily(
                      expandedFamily === family.family_id ? null : family.family_id,
                    )
                  }
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3.5 rounded-t-2xl border border-b-0 text-left transition-all',
                    expandedFamily === family.family_id
                      ? 'bg-[#0F0F17] border-[#1E1E2A]'
                      : 'bg-[#0A0A10] border-[#1A1A25] hover:border-[#27273A] rounded-b-2xl border-b',
                  )}
                >
                  <div className="w-7 h-7 rounded-lg bg-violet-600/15 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-slate-200 truncate">{family.family_name}</p>
                    {origin && (
                      <p className="text-[11px] text-slate-700 truncate">
                        Refinamento de: {origin.family_name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[11px] text-slate-700">{family.images.length} imagens</span>
                    {expandedFamily === family.family_id ? (
                      <ChevronUp className="w-4 h-4 text-slate-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-600" />
                    )}
                  </div>
                </button>

                {expandedFamily === family.family_id && (
                  <FamilyCard
                    family={family}
                    isSelected={selectedFamilyId === family.family_id}
                    onSelect={() =>
                      setSelectedFamilyId(
                        selectedFamilyId === family.family_id ? null : family.family_id,
                      )
                    }
                    onRefine={() => setRefineTarget(family)}
                    onDownload={handleDownloadImage}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Refinement modal */}
      {refineTarget && (
        <RefinementModal
          family={refineTarget}
          isLoading={isRefining}
          onConfirm={(instruction) => handleRefine(refineTarget, instruction)}
          onClose={() => setRefineTarget(null)}
        />
      )}
    </div>
  )
}
