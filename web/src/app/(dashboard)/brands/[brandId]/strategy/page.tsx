'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Pencil, Plus, FileText, Lightbulb, MoreHorizontal,
  Trash2, X, ArrowLeft,
} from 'lucide-react'
import { PageHeader }  from '@/components/shared/PageHeader'
import Link            from 'next/link'
import {
  useBrand, usePillars,
  useUpdateBrand, useDeleteBrand,
  useCreatePillar, useUpdatePillar, useDeletePillar,
} from '@/hooks/useBrands'
import { useBrandStore } from '@/store/brandStore'
import { cn } from '@/lib/utils/cn'
import type { ContentPillar } from '@/types'
import type { CreateBrandPayload } from '@/services/brandService'
import type { CreatePillarPayload } from '@/services/brandService'

// ── Tabs ───────────────────────────────────────────────────────────────────────

const TABS = ['Visão Geral', 'Pilares', 'Tom de Voz', 'Configurações'] as const
type Tab = (typeof TABS)[number]

// ── Color palette for pillars ──────────────────────────────────────────────────

const PILLAR_COLORS = [
  { label: 'Índigo',    value: '#6366f1' },
  { label: 'Esmeralda', value: '#10b981' },
  { label: 'Âmbar',     value: '#f59e0b' },
  { label: 'Rosa',      value: '#ec4899' },
  { label: 'Ciano',     value: '#06b6d4' },
  { label: 'Laranja',   value: '#f97316' },
  { label: 'Violeta',   value: '#8b5cf6' },
  { label: 'Lima',      value: '#84cc16' },
]

function defaultColor(idx: number) {
  return PILLAR_COLORS[idx % PILLAR_COLORS.length].value
}

// ── EditBrandModal ─────────────────────────────────────────────────────────────

interface EditBrandModalProps {
  brandId:  number
  initial:  { name: string; niche: string | null; description: string | null; tone_of_voice: string | null }
  onClose:  () => void
}

function EditBrandModal({ brandId, initial, onClose }: EditBrandModalProps) {
  const [name,        setName]        = useState(initial.name           ?? '')
  const [niche,       setNiche]       = useState(initial.niche          ?? '')
  const [description, setDescription] = useState(initial.description    ?? '')
  const [tone,        setTone]        = useState(initial.tone_of_voice  ?? '')

  const updateBrand = useUpdateBrand(brandId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const payload: CreateBrandPayload = {
      name:          name.trim(),
      niche:         niche.trim()       || undefined,
      description:   description.trim() || undefined,
      tone_of_voice: tone.trim()        || undefined,
    }
    updateBrand.mutate(payload, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#111118] border border-[#27273A] rounded-xl w-[520px] shadow-modal animate-fade-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E1E2A]">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Editar marca</h2>
            <p className="text-xs text-slate-500 mt-0.5">Atualize as informações editoriais da marca.</p>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-600 hover:text-slate-400 hover:bg-[#17171F] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="field-label block mb-1.5">
                Nome <span className="text-red-500 normal-case text-xs ml-0.5">*</span>
              </label>
              <input value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Minha Marca" className="input" autoFocus required />
            </div>
            <div>
              <label className="field-label block mb-1.5">Nicho / Segmento</label>
              <input value={niche} onChange={(e) => setNiche(e.target.value)}
                placeholder="Ex.: Marketing Digital, Saúde e Bem-estar" className="input" />
            </div>
            <div>
              <label className="field-label block mb-1.5">Descrição</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                rows={3} placeholder="O que essa marca faz? Qual é o seu posicionamento?"
                className="input h-auto py-2.5 resize-none leading-relaxed" />
            </div>
            <div>
              <label className="field-label block mb-1.5">Tom de voz</label>
              <textarea value={tone} onChange={(e) => setTone(e.target.value)}
                rows={2} placeholder="Ex.: Profissional, didático e empático."
                className="input h-auto py-2.5 resize-none leading-relaxed" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#1E1E2A]">
            <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
            <button type="submit" disabled={updateBrand.isPending || !name.trim()}
              className="btn-primary min-w-[120px]">
              {updateBrand.isPending
                ? <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Salvando…
                  </span>
                : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── PillarFormModal ────────────────────────────────────────────────────────────

interface PillarFormModalProps {
  brandId:   number
  initial?:  ContentPillar
  pillarIdx: number
  onClose:   () => void
}

function PillarFormModal({ brandId, initial, pillarIdx, onClose }: PillarFormModalProps) {
  const isEdit = !!initial
  const [name,        setName]        = useState(initial?.name        ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [color,       setColor]       = useState(initial?.color       ?? defaultColor(pillarIdx))

  const createPillar = useCreatePillar(brandId)
  const updatePillar = useUpdatePillar(initial?.id ?? 0, brandId)
  const isPending    = createPillar.isPending || updatePillar.isPending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const payload: CreatePillarPayload = {
      name:        name.trim(),
      description: description.trim() || undefined,
      color,
    }
    if (isEdit) {
      updatePillar.mutate(payload, { onSuccess: onClose })
    } else {
      createPillar.mutate(payload, { onSuccess: onClose })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#111118] border border-[#27273A] rounded-xl w-[460px] shadow-modal animate-fade-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E1E2A]">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              {isEdit ? 'Editar pilar' : 'Novo pilar'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEdit ? 'Atualize as informações do pilar.' : 'Defina um novo pilar de conteúdo.'}
            </p>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-600 hover:text-slate-400 hover:bg-[#17171F] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="field-label block mb-1.5">
                Nome <span className="text-red-500 normal-case text-xs ml-0.5">*</span>
              </label>
              <input value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Educação, Bastidores, Cases de Sucesso"
                className="input" autoFocus required />
            </div>
            <div>
              <label className="field-label block mb-1.5">Descrição</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                rows={2} placeholder="Do que trata esse pilar de conteúdo?"
                className="input h-auto py-2.5 resize-none leading-relaxed" />
            </div>
            <div>
              <label className="field-label block mb-2">Cor</label>
              <div className="flex items-center gap-2 flex-wrap">
                {PILLAR_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    title={c.label}
                    className={cn(
                      'w-6 h-6 rounded-full border-2 transition-all',
                      color === c.value ? 'border-white scale-110' : 'border-transparent hover:scale-105',
                    )}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#1E1E2A]">
            <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
            <button type="submit" disabled={isPending || !name.trim()}
              className="btn-primary min-w-[120px]">
              {isPending
                ? <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Salvando…
                  </span>
                : isEdit ? 'Salvar alterações' : 'Criar pilar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── DeletePillarModal ──────────────────────────────────────────────────────────

interface DeletePillarModalProps {
  pillar:   ContentPillar
  brandId:  number
  onClose:  () => void
}

function DeletePillarModal({ pillar, brandId, onClose }: DeletePillarModalProps) {
  const deletePillar = useDeletePillar(brandId)

  function handleDelete() {
    deletePillar.mutate(pillar.id, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#111118] border border-[#27273A] rounded-xl w-[400px] shadow-modal animate-fade-up">
        <div className="px-6 py-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-red-950/40 border border-red-900/30 flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Excluir pilar</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Tem certeza que deseja excluir{' '}
                <span className="text-slate-200 font-medium">{pillar.name}</span>?
                Os posts e ideias vinculados perderão a associação com esse pilar.
              </p>
            </div>
          </div>
          <div className="bg-red-950/20 border border-red-900/20 rounded-lg px-3.5 py-2.5">
            <p className="text-[11px] text-red-400 leading-relaxed">Esta ação não pode ser desfeita.</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#1E1E2A]">
          <button onClick={onClose} className="btn-ghost">Cancelar</button>
          <button onClick={handleDelete} disabled={deletePillar.isPending}
            className="btn-danger min-w-[100px]">
            {deletePillar.isPending
              ? <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                  Excluindo…
                </span>
              : 'Excluir pilar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── DeleteBrandModal ───────────────────────────────────────────────────────────

interface DeleteBrandModalProps {
  brandName: string
  onClose:   () => void
  onConfirm: () => void
  loading:   boolean
}

function DeleteBrandModal({ brandName, onClose, onConfirm, loading }: DeleteBrandModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#111118] border border-[#27273A] rounded-xl w-[420px] shadow-modal animate-fade-up">
        <div className="px-6 py-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-red-950/40 border border-red-900/30 flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Excluir marca</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Tem certeza que deseja excluir{' '}
                <span className="text-slate-200 font-medium">{brandName}</span>?
                Todos os posts, ideias e pilares vinculados serão permanentemente removidos.
              </p>
            </div>
          </div>
          <div className="bg-red-950/20 border border-red-900/20 rounded-lg px-3.5 py-2.5">
            <p className="text-[11px] text-red-400 leading-relaxed">Esta ação não pode ser desfeita.</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#1E1E2A]">
          <button onClick={onClose} className="btn-ghost">Cancelar</button>
          <button onClick={onConfirm} disabled={loading} className="btn-danger min-w-[110px]">
            {loading
              ? <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                  Excluindo…
                </span>
              : 'Excluir marca'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── PillarCard ─────────────────────────────────────────────────────────────────

interface PillarCardProps {
  pillar:  ContentPillar
  index:   number
  brandId: number
  onEdit:  (p: ContentPillar) => void
  onDelete:(p: ContentPillar) => void
}

function PillarCard({ pillar, index, brandId: _brandId, onEdit, onDelete }: PillarCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const dotColor = pillar.color ?? defaultColor(index)

  return (
    <div className="card p-5 flex flex-col gap-3 hover:border-[#3F3F56] transition-colors">
      <div className="flex items-start justify-between">
        <div
          className="w-3 h-3 rounded-full mt-0.5 flex-shrink-0"
          style={{ backgroundColor: dotColor }}
        />
        <div ref={menuRef} className="relative flex-shrink-0">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#17171F] text-slate-600 hover:text-slate-400 transition-colors"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-36 bg-[#111118] border border-[#27273A] rounded-lg shadow-modal z-10 animate-fade-up overflow-hidden">
              <button
                onClick={() => { setMenuOpen(false); onEdit(pillar) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-slate-300 hover:bg-[#17171F] hover:text-slate-100 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5 text-slate-500" />
                Editar
              </button>
              <div className="border-t border-[#1E1E2A] my-0.5" />
              <button
                onClick={() => { setMenuOpen(false); onDelete(pillar) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-red-400 hover:bg-red-950/40 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir
              </button>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-[13px] font-semibold text-slate-100 mb-1">{pillar.name}</h3>
        {pillar.description ? (
          <p className="text-[12px] text-slate-500 leading-relaxed line-clamp-2">
            {pillar.description}
          </p>
        ) : (
          <p className="text-[12px] text-slate-700 italic">Sem descrição</p>
        )}
      </div>

      <div className="flex items-center gap-3 pt-3 border-t border-[#1E1E2A]">
        <span className="flex items-center gap-1 text-[11px] text-slate-600">
          <FileText className="w-3 h-3" />
          {pillar.post_count ?? 0} posts
        </span>
        <span className="flex items-center gap-1 text-[11px] text-slate-600">
          <Lightbulb className="w-3 h-3" />
          {pillar.idea_count ?? 0} ideias
        </span>
      </div>
    </div>
  )
}

// ── StrategyPage ───────────────────────────────────────────────────────────────

export default function StrategyPage({ params }: { params: { brandId: string } }) {
  const brandId = Number(params.brandId)
  const router  = useRouter()

  const { data: brand,   isLoading: brandLoading   } = useBrand(brandId)
  const { data: pillars = [], isLoading: pillarsLoading } = usePillars(brandId)

  const updateBrand   = useUpdateBrand(brandId)
  const deleteBrand   = useDeleteBrand()
  const setActiveBrand    = useBrandStore((s) => s.setActiveBrand)
  const clearActiveBrand  = useBrandStore((s) => s.clearActiveBrand)
  const activeBrand       = useBrandStore((s) => s.activeBrand)

  const [activeTab,      setActiveTab]      = useState<Tab>('Visão Geral')
  const [editBrandOpen,  setEditBrandOpen]  = useState(false)
  const [deleteBrandOpen,setDeleteBrandOpen]= useState(false)

  // Pillar modals
  const [pillarCreate,   setPillarCreate]   = useState(false)
  const [pillarEdit,     setPillarEdit]     = useState<ContentPillar | null>(null)
  const [pillarDelete,   setPillarDelete]   = useState<ContentPillar | null>(null)

  // Tom de Voz inline edit
  const [toneEdit,       setToneEdit]       = useState(false)
  const [toneValue,      setToneValue]      = useState('')

  function openToneEdit() {
    setToneValue(brand?.tone_of_voice ?? '')
    setToneEdit(true)
  }

  function saveTone() {
    updateBrand.mutate(
      { tone_of_voice: toneValue.trim() || undefined },
      { onSuccess: () => setToneEdit(false) },
    )
  }

  function handleDeleteBrand() {
    deleteBrand.mutate(brandId, {
      onSuccess: () => {
        if (activeBrand?.id === brandId) clearActiveBrand()
        router.push('/brands')
      },
    })
  }

  // ── Loading / not found ────────────────────────────────────────────────────

  if (brandLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4 max-w-[900px]">
          <div className="h-6 bg-[#1E1E2A] rounded w-40" />
          <div className="h-3 bg-[#1E1E2A] rounded w-64" />
          <div className="h-0.5 bg-[#1E1E2A] rounded mt-8" />
          <div className="grid grid-cols-3 gap-4 mt-4">
            {[0,1,2].map((i) => <div key={i} className="h-[140px] bg-[#17171F] rounded-xl" />)}
          </div>
        </div>
      </div>
    )
  }

  if (!brand) {
    return (
      <div className="p-6 text-slate-500 text-sm">Marca não encontrada.</div>
    )
  }

  return (
    <>
      {/* Modals */}
      {editBrandOpen && (
        <EditBrandModal
          brandId={brandId}
          initial={brand}
          onClose={() => setEditBrandOpen(false)}
        />
      )}
      {deleteBrandOpen && (
        <DeleteBrandModal
          brandName={brand.name}
          onClose={() => setDeleteBrandOpen(false)}
          onConfirm={handleDeleteBrand}
          loading={deleteBrand.isPending}
        />
      )}
      {pillarCreate && (
        <PillarFormModal
          brandId={brandId}
          pillarIdx={pillars.length}
          onClose={() => setPillarCreate(false)}
        />
      )}
      {pillarEdit && (
        <PillarFormModal
          brandId={brandId}
          initial={pillarEdit}
          pillarIdx={pillars.findIndex((p) => p.id === pillarEdit.id)}
          onClose={() => setPillarEdit(null)}
        />
      )}
      {pillarDelete && (
        <DeletePillarModal
          pillar={pillarDelete}
          brandId={brandId}
          onClose={() => setPillarDelete(null)}
        />
      )}

      <div className="p-6 max-w-[960px]">
        {/* Back link */}
        <Link
          href="/brands"
          className="inline-flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-300 transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Marcas
        </Link>

        <PageHeader
          title={brand.name}
          subtitle={[brand.niche, 'Estratégia de Conteúdo'].filter(Boolean).join(' · ')}
          className="mb-6"
        >
          <button onClick={() => setEditBrandOpen(true)} className="btn-secondary">
            <Pencil className="w-3.5 h-3.5" />
            Editar
          </button>
        </PageHeader>

        {/* Tabs */}
        <div className="flex items-center gap-0.5 border-b border-[#1E1E2A] mb-6">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'relative px-4 py-2.5 text-[13px] font-medium transition-colors',
                activeTab === tab
                  ? 'text-slate-100'
                  : 'text-slate-500 hover:text-slate-300',
              )}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-t" />
              )}
            </button>
          ))}
        </div>

        {/* ── Visão Geral ──────────────────────────────────────────────────── */}
        {activeTab === 'Visão Geral' && (
          <div className="space-y-4">
            <div className="card p-6">
              <h3 className="field-label mb-4">Identidade da Marca</h3>
              <div className="flex items-start gap-5">
                <div className="w-12 h-12 rounded-xl bg-indigo-600/15 border border-indigo-500/25 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl font-bold text-indigo-400">
                    {brand.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-4">
                  <div>
                    <p className="field-label mb-1">Nome</p>
                    <p className="text-[13px] text-slate-100 font-medium">{brand.name}</p>
                  </div>
                  <div>
                    <p className="field-label mb-1">Nicho / Segmento</p>
                    <p className="text-[13px] text-slate-300">
                      {brand.niche ?? <span className="text-slate-600 italic">Não definido</span>}
                    </p>
                  </div>
                  {brand.description && (
                    <div className="col-span-2">
                      <p className="field-label mb-1">Descrição</p>
                      <p className="text-[13px] text-slate-300 leading-relaxed">{brand.description}</p>
                    </div>
                  )}
                  {brand.tone_of_voice && (
                    <div className="col-span-2">
                      <p className="field-label mb-1">Tom de Voz</p>
                      <p className="text-[13px] text-slate-300 leading-relaxed">{brand.tone_of_voice}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Posts',   value: brand.post_count  ?? 0 },
                { label: 'Ideias',  value: brand.idea_count  ?? 0 },
                { label: 'Pilares', value: pillars.length },
              ].map((stat) => (
                <div key={stat.label} className="card p-4 text-center">
                  <p className="text-[26px] font-bold text-slate-100 leading-none">{stat.value}</p>
                  <p className="text-[10px] text-slate-500 mt-1.5 uppercase tracking-wider font-semibold">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Pilares ──────────────────────────────────────────────────────── */}
        {activeTab === 'Pilares' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[12px] text-slate-500">
                {pillars.length === 0
                  ? 'Nenhum pilar definido ainda.'
                  : `${pillars.length} pilar${pillars.length !== 1 ? 'es' : ''} de conteúdo definido${pillars.length !== 1 ? 's' : ''}.`}
              </p>
              <button onClick={() => setPillarCreate(true)} className="btn-primary">
                <Plus className="w-3.5 h-3.5" />
                Novo pilar
              </button>
            </div>

            {pillarsLoading ? (
              <div className="grid grid-cols-3 gap-4">
                {[0,1,2].map((i) => (
                  <div key={i} className="h-[160px] bg-[#17171F] rounded-xl animate-pulse" />
                ))}
              </div>
            ) : pillars.length === 0 ? (
              <div className="card p-10 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#17171F] border border-[#27273A] flex items-center justify-center">
                  <Plus className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-slate-400">Nenhum pilar criado</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Crie pilares para organizar seu conteúdo por tema.
                  </p>
                </div>
                <button onClick={() => setPillarCreate(true)} className="btn-secondary mt-1">
                  <Plus className="w-3.5 h-3.5" />
                  Criar primeiro pilar
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {pillars.map((pillar, i) => (
                  <PillarCard
                    key={pillar.id}
                    pillar={pillar}
                    index={i}
                    brandId={brandId}
                    onEdit={setPillarEdit}
                    onDelete={setPillarDelete}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tom de Voz ───────────────────────────────────────────────────── */}
        {activeTab === 'Tom de Voz' && (
          <div className="space-y-4">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="field-label">Tom de Voz</h3>
                {!toneEdit && (
                  <button onClick={openToneEdit} className="btn-ghost">
                    <Pencil className="w-3.5 h-3.5" />
                    Editar
                  </button>
                )}
              </div>

              {toneEdit ? (
                <div className="space-y-3">
                  <textarea
                    value={toneValue}
                    onChange={(e) => setToneValue(e.target.value)}
                    rows={5}
                    autoFocus
                    placeholder="Descreva o tom de voz da marca. Ex.: Profissional, didático e empático. Evita gírias e tecnicismos."
                    className="input h-auto py-2.5 resize-none leading-relaxed"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => setToneEdit(false)} className="btn-ghost">
                      Cancelar
                    </button>
                    <button
                      onClick={saveTone}
                      disabled={updateBrand.isPending}
                      className="btn-primary min-w-[100px]"
                    >
                      {updateBrand.isPending
                        ? <span className="flex items-center gap-2">
                            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Salvando…
                          </span>
                        : 'Salvar'}
                    </button>
                  </div>
                </div>
              ) : brand.tone_of_voice ? (
                <p className="text-[13px] text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {brand.tone_of_voice}
                </p>
              ) : (
                <p className="text-[13px] text-slate-600 italic">
                  Nenhum tom de voz definido.{' '}
                  <button onClick={openToneEdit} className="text-indigo-400 hover:text-indigo-300 not-italic underline-offset-2 hover:underline transition-colors">
                    Definir agora
                  </button>
                </p>
              )}
            </div>

            <div className="card p-5">
              <p className="field-label mb-3">Diretrizes Editoriais</p>
              <p className="text-[12px] text-slate-500 leading-relaxed">
                Use o campo de tom de voz acima para descrever o estilo de comunicação da marca,
                palavras que devem ser evitadas, nível de formalidade e qualquer diretriz que guie
                a produção de conteúdo.
              </p>
            </div>
          </div>
        )}

        {/* ── Configurações ────────────────────────────────────────────────── */}
        {activeTab === 'Configurações' && (
          <div className="space-y-4 max-w-[600px]">
            <div className="card p-5">
              <h3 className="field-label mb-1">Informações da Marca</h3>
              <p className="text-[12px] text-slate-500 mb-4 leading-relaxed">
                Edite o nome, nicho, descrição e tom de voz da marca.
              </p>
              <button onClick={() => setEditBrandOpen(true)} className="btn-secondary">
                <Pencil className="w-3.5 h-3.5" />
                Editar informações
              </button>
            </div>

            <div className="card p-5 border-red-900/30">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-red-400 mb-1">
                Zona de Perigo
              </h3>
              <p className="text-[12px] text-slate-500 mb-4 leading-relaxed">
                Excluir a marca removerá permanentemente todos os posts, ideias e pilares associados.
                Esta ação não pode ser desfeita.
              </p>
              <button onClick={() => setDeleteBrandOpen(true)} className="btn-danger">
                <Trash2 className="w-3.5 h-3.5" />
                Excluir marca
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
