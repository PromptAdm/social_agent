'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  Plus, FileText, Lightbulb, MoreHorizontal,
  Pencil, Trash2, ExternalLink, X,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState }  from '@/components/shared/EmptyState'
import {
  useBrands, useCreateBrand, useUpdateBrand, useDeleteBrand,
} from '@/hooks/useBrands'
import { useBrandStore } from '@/store/brandStore'
import { cn } from '@/lib/utils/cn'
import type { Brand } from '@/types'
import type { CreateBrandPayload } from '@/services/brandService'

// ── BrandFormModal ─────────────────────────────────────────────────────────────

interface BrandFormModalProps {
  initial?: Brand
  onClose:  () => void
}

function BrandFormModal({ initial, onClose }: BrandFormModalProps) {
  const isEdit = !!initial

  const [name,         setName]         = useState(initial?.name          ?? '')
  const [niche,        setNiche]        = useState(initial?.niche          ?? '')
  const [description,  setDescription]  = useState(initial?.description   ?? '')
  const [tone,         setTone]         = useState(initial?.tone_of_voice  ?? '')

  const createBrand = useCreateBrand()
  const updateBrand = useUpdateBrand(initial?.id ?? 0)

  const isPending = createBrand.isPending || updateBrand.isPending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    const payload: CreateBrandPayload = {
      name:           name.trim(),
      niche:          niche.trim()       || undefined,
      description:    description.trim() || undefined,
      tone_of_voice:  tone.trim()        || undefined,
    }

    if (isEdit) {
      updateBrand.mutate(payload, { onSuccess: onClose })
    } else {
      createBrand.mutate(payload, { onSuccess: onClose })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#111118] border border-[#27273A] rounded-xl w-[520px] shadow-modal animate-fade-up">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E1E2A]">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              {isEdit ? 'Editar marca' : 'Nova marca'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEdit
                ? 'Atualize as informações editoriais da marca.'
                : 'Configure a identidade editorial da sua nova marca.'}
            </p>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-600 hover:text-slate-400 hover:bg-[#17171F] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4">

            {/* Name */}
            <div>
              <label className="field-label block mb-1.5">
                Nome <span className="text-red-500 normal-case text-xs ml-0.5">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Minha Marca"
                className="input"
                autoFocus
                required
              />
            </div>

            {/* Niche */}
            <div>
              <label className="field-label block mb-1.5">Nicho / Segmento</label>
              <input
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="Ex.: Marketing Digital, Saúde e Bem-estar"
                className="input"
              />
            </div>

            {/* Description */}
            <div>
              <label className="field-label block mb-1.5">Descrição</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="O que essa marca faz? Qual é o seu posicionamento?"
                className="input h-auto py-2.5 resize-none leading-relaxed"
              />
            </div>

            {/* Tone of voice */}
            <div>
              <label className="field-label block mb-1.5">Tom de voz</label>
              <textarea
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                rows={2}
                placeholder="Ex.: Profissional, didático e empático. Evita gírias e tecnicismos."
                className="input h-auto py-2.5 resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#1E1E2A]">
            <button type="button" onClick={onClose}
              className="btn-ghost">
              Cancelar
            </button>
            <button type="submit" disabled={isPending || !name.trim()}
              className="btn-primary min-w-[120px]">
              {isPending
                ? <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Salvando…
                  </span>
                : isEdit ? 'Salvar alterações' : 'Criar marca'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── DeleteBrandModal ───────────────────────────────────────────────────────────

interface DeleteBrandModalProps {
  brand:    Brand
  onClose:  () => void
  onDelete: () => void
  loading:  boolean
}

function DeleteBrandModal({ brand, onClose, onDelete, loading }: DeleteBrandModalProps) {
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
                <span className="text-slate-200 font-medium">{brand.name}</span>?
                Todos os posts, ideias e pilares vinculados serão permanentemente removidos.
              </p>
            </div>
          </div>

          <div className="bg-red-950/20 border border-red-900/20 rounded-lg px-3.5 py-2.5">
            <p className="text-[11px] text-red-400 leading-relaxed">
              Esta ação não pode ser desfeita.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#1E1E2A]">
          <button onClick={onClose} className="btn-ghost">
            Cancelar
          </button>
          <button onClick={onDelete} disabled={loading}
            className="btn-danger min-w-[100px]">
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

// ── BrandCard ──────────────────────────────────────────────────────────────────

interface BrandCardProps {
  brand:    Brand
  onEdit:   (b: Brand) => void
  onDelete: (b: Brand) => void
}

function BrandCard({ brand, onEdit, onDelete }: BrandCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
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

  return (
    <div className="card p-5 flex flex-col gap-4 hover:border-[#27273A] transition-colors group">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-600/12 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-base font-bold text-indigo-400">
              {brand.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="text-[13px] font-semibold text-slate-100 truncate">
              {brand.name}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              {brand.niche ?? 'Sem nicho definido'}
            </p>
          </div>
        </div>

        {/* Dropdown menu */}
        <div ref={menuRef} className="relative flex-shrink-0">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-600 hover:text-slate-400 hover:bg-[#17171F] transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-[#111118] border border-[#27273A] rounded-lg shadow-modal z-10 animate-fade-up overflow-hidden">
              <button
                onClick={() => { setMenuOpen(false); onEdit(brand) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-slate-300 hover:bg-[#17171F] hover:text-slate-100 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5 text-slate-500" />
                Editar
              </button>
              <Link
                href={`/brands/${brand.id}/strategy`}
                onClick={() => setMenuOpen(false)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-slate-300 hover:bg-[#17171F] hover:text-slate-100 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                Abrir estratégia
              </Link>
              <div className="border-t border-[#1E1E2A] my-0.5" />
              <button
                onClick={() => { setMenuOpen(false); onDelete(brand) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-red-400 hover:bg-red-950/40 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {brand.description ? (
        <p className="text-[12px] text-slate-500 leading-relaxed line-clamp-2 flex-1">
          {brand.description}
        </p>
      ) : (
        <p className="text-[12px] text-slate-700 italic flex-1">Sem descrição</p>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 pt-3 border-t border-[#1A1A24]">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
          <FileText className="w-3 h-3" />
          <span>{brand.post_count ?? 0} posts</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
          <Lightbulb className="w-3 h-3" />
          <span>{brand.idea_count ?? 0} ideias</span>
        </div>
      </div>

      {/* CTA */}
      <Link
        href={`/brands/${brand.id}/strategy`}
        className="btn-secondary w-full justify-center text-[13px]"
      >
        Abrir
      </Link>
    </div>
  )
}

// ── BrandsPage ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[#17171F] rounded-xl', className)} />
}

export default function BrandsPage() {
  const { data: brands = [], isLoading } = useBrands()
  const deleteBrand = useDeleteBrand()
  const setActiveBrand   = useBrandStore((s) => s.setActiveBrand)
  const clearActiveBrand = useBrandStore((s) => s.clearActiveBrand)
  const activeBrand      = useBrandStore((s) => s.activeBrand)

  const [createOpen,    setCreateOpen]    = useState(false)
  const [editTarget,    setEditTarget]    = useState<Brand | null>(null)
  const [deleteTarget,  setDeleteTarget]  = useState<Brand | null>(null)

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    deleteBrand.mutate(deleteTarget.id, {
      onSuccess: () => {
        // If the deleted brand was active, clear it
        if (activeBrand?.id === deleteTarget.id) {
          clearActiveBrand()
        }
        setDeleteTarget(null)
      },
    })
  }

  return (
    <>
      {/* Modals */}
      {createOpen && (
        <BrandFormModal onClose={() => setCreateOpen(false)} />
      )}
      {editTarget && (
        <BrandFormModal
          initial={editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}
      {deleteTarget && (
        <DeleteBrandModal
          brand={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDelete={handleDeleteConfirm}
          loading={deleteBrand.isPending}
        />
      )}

      <div className="p-6 max-w-[1200px]">
        <PageHeader
          title="Marcas"
          subtitle="Gerencie suas marcas e estratégias de conteúdo."
          className="mb-6"
        >
          <button
            onClick={() => setCreateOpen(true)}
            className="btn-primary"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova marca
          </button>
        </PageHeader>

        {isLoading ? (
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[224px]" />
            ))}
          </div>
        ) : brands.length === 0 ? (
          <EmptyState
            title="Nenhuma marca criada"
            description="Crie sua primeira marca para começar a organizar o conteúdo."
            action={{ label: '+ Nova marca', onClick: () => setCreateOpen(true) }}
          />
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {brands.map((brand) => (
              <BrandCard
                key={brand.id}
                brand={brand}
                onEdit={setEditTarget}
                onDelete={setDeleteTarget}
              />
            ))}

            {/* Add new brand placeholder */}
            <button
              onClick={() => setCreateOpen(true)}
              className={cn(
                'border border-dashed border-[#27273A] rounded-xl p-5',
                'flex flex-col items-center justify-center gap-3',
                'hover:border-indigo-500/30 hover:bg-indigo-600/5',
                'transition-colors cursor-pointer min-h-[200px] group',
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-full border border-dashed border-[#3F3F56]',
                'group-hover:border-indigo-500/40 flex items-center justify-center transition-colors',
              )}>
                <Plus className="w-5 h-5 text-slate-600 group-hover:text-indigo-400 transition-colors" />
              </div>
              <div className="text-center">
                <p className="text-[13px] font-medium text-slate-500 group-hover:text-slate-300 transition-colors">
                  Adicionar marca
                </p>
                <p className="text-[11px] text-slate-700 mt-0.5">
                  Comece uma nova estratégia
                </p>
              </div>
            </button>
          </div>
        )}
      </div>
    </>
  )
}
