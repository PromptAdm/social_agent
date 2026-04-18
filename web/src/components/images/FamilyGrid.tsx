'use client'

import { type ReactNode, useState } from 'react'
import { RotateCcw, Sparkles, ChevronDown, ChevronUp, Images, Layers, Zap } from 'lucide-react'
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

  const originalFamilies = families.filter((f) => !f.refined_from)
  const refinedFamilies  = families.filter((f) => !!f.refined_from)

  const totalImages = families.reduce((acc, f) => acc + f.images.length, 0)

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-7">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-[19px] font-semibold text-slate-900 tracking-tight">
            {project.title ?? 'Famílias Visuais'}
          </h2>
          {direction && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {direction.style && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 capitalize">
                  {direction.style}
                </span>
              )}
              {direction.tone && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-700/30 text-slate-500 border border-slate-700/30 capitalize">
                  {direction.tone}
                </span>
              )}
              {direction.mode && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-violet-500/8 text-violet-500 border border-violet-500/15 capitalize">
                  {direction.mode}
                </span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={onNewProject}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 text-[13px] font-medium text-slate-500 hover:text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all flex-shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Novo projeto
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Famílias geradas',     value: originalFamilies.length, Icon: Images,  color: 'text-indigo-400', bg: 'bg-indigo-500/8  border-indigo-500/15' },
          { label: 'Variações visuais',     value: totalImages,              Icon: Layers,  color: 'text-violet-400', bg: 'bg-violet-500/8  border-violet-500/15' },
          { label: 'Créditos utilizados',  value: project.credits_cost,     Icon: Zap,     color: 'text-amber-400',  bg: 'bg-amber-500/8   border-amber-500/15' },
        ].map(({ label, value, Icon, color, bg }) => (
          <div key={label} className={cn('border rounded-2xl py-4 px-5 flex items-center gap-4', bg)}>
            <div className="flex-shrink-0">
              <Icon className={cn('w-5 h-5', color)} />
            </div>
            <div>
              <p className="text-[22px] font-bold text-slate-900 leading-none tabular-nums">{value}</p>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-tight">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Original families */}
      <div className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-600 px-1">
          Famílias geradas
        </p>
        {originalFamilies.map((family, idx) => (
          <FamilyAccordion
            key={family.family_id}
            family={family}
            isExpanded={expandedFamily === family.family_id}
            onToggle={() =>
              setExpandedFamily(expandedFamily === family.family_id ? null : family.family_id)
            }
            isSelected={selectedFamilyId === family.family_id}
            onSelect={() =>
              setSelectedFamilyId(selectedFamilyId === family.family_id ? null : family.family_id)
            }
            onRefine={() => setRefineTarget(family)}
            onDownload={handleDownloadImage}
            badgeVariant="indigo"
            badgeContent={<span className="text-[12px] font-bold text-indigo-400">{idx + 1}</span>}
          />
        ))}
      </div>

      {/* Refined families */}
      {refinedFamilies.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-600 px-1">
            Variações refinadas
          </p>
          {refinedFamilies.map((family) => {
            const origin = originalFamilies.find((f) => f.family_id === family.refined_from)
            return (
              <FamilyAccordion
                key={family.family_id}
                family={family}
                isExpanded={expandedFamily === family.family_id}
                onToggle={() =>
                  setExpandedFamily(expandedFamily === family.family_id ? null : family.family_id)
                }
                isSelected={selectedFamilyId === family.family_id}
                onSelect={() =>
                  setSelectedFamilyId(selectedFamilyId === family.family_id ? null : family.family_id)
                }
                onRefine={() => setRefineTarget(family)}
                onDownload={handleDownloadImage}
                badgeVariant="violet"
                badgeContent={<Sparkles className="w-3.5 h-3.5 text-violet-400" />}
                subtitle={origin ? `Refinamento de: ${origin.family_name}` : undefined}
              />
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

// ── Family accordion sub-component ───────────────────────────────────────────

interface FamilyAccordionProps {
  family:        ImageFamily
  isExpanded:    boolean
  onToggle:      () => void
  isSelected:    boolean
  onSelect:      () => void
  onRefine:      () => void
  onDownload:    (url: string, name: string, idx: number) => void
  badgeVariant:  'indigo' | 'violet'
  badgeContent:  ReactNode
  subtitle?:     string
}

function FamilyAccordion({
  family, isExpanded, onToggle,
  isSelected, onSelect, onRefine, onDownload,
  badgeVariant, badgeContent, subtitle,
}: FamilyAccordionProps) {
  const badgeCls = badgeVariant === 'indigo'
    ? 'bg-indigo-600/15 border-indigo-500/20'
    : 'bg-violet-600/15 border-violet-500/20'

  return (
    <div className={cn(
      'rounded-2xl overflow-hidden border transition-all duration-200',
      isExpanded ? 'border-slate-200' : 'border-slate-200 hover:border-slate-300',
    )}>
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition-colors',
          isExpanded ? 'bg-white' : 'bg-white hover:bg-white',
        )}
      >
        <div className={cn(
          'w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0',
          badgeCls,
        )}>
          {badgeContent}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-slate-700 truncate leading-tight">
            {family.family_name}
          </p>
          <p className="text-[12px] text-slate-600 truncate mt-0.5 leading-tight">
            {subtitle ?? family.description}
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <span className="text-[11px] text-slate-700 tabular-nums">
            {family.images.length} variações
          </span>
          {isExpanded
            ? <ChevronUp   className="w-4 h-4 text-slate-600" />
            : <ChevronDown className="w-4 h-4 text-slate-600" />}
        </div>
      </button>

      {isExpanded && (
        <FamilyCard
          family={family}
          isSelected={isSelected}
          onSelect={onSelect}
          onRefine={onRefine}
          onDownload={onDownload}
        />
      )}
    </div>
  )
}
