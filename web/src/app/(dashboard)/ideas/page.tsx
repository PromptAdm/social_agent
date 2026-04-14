'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Zap, X, Lightbulb, Pencil, Trash2,
  ArrowRight, MoreHorizontal, FileText, Check,
} from 'lucide-react'
import { PageHeader }  from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState }  from '@/components/shared/EmptyState'
import { useBrandStore } from '@/store/brandStore'
import { usePillars }    from '@/hooks/useBrands'
import {
  useIdeas, useCreateIdea, useUpdateIdea, useDeleteIdea, useIdeaToPost,
} from '@/hooks/useIdeas'
import { cn } from '@/lib/utils/cn'
import type { Idea, IdeaPrioridade, IdeaStatus, IdeaFormatoSugerido, SocialPlatform } from '@/types'
import type { CreateIdeaPayload, UpdateIdeaPayload } from '@/services/ideaService'

// ── Constants ──────────────────────────────────────────────────────────────────

const FORMAT_OPTIONS: { value: IdeaFormatoSugerido; label: string }[] = [
  { value: 'indefinido',   label: 'Indefinido' },
  { value: 'carrossel',    label: 'Carrossel' },
  { value: 'reels',        label: 'Reels' },
  { value: 'imagem_unica', label: 'Imagem única' },
  { value: 'stories',      label: 'Stories' },
  { value: 'texto',        label: 'Texto' },
  { value: 'video',        label: 'Vídeo' },
  { value: 'live',         label: 'Live' },
]

const PLATFORM_OPTIONS: { value: SocialPlatform; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'linkedin',  label: 'LinkedIn' },
  { value: 'twitter',   label: 'Twitter / X' },
  { value: 'facebook',  label: 'Facebook' },
  { value: 'tiktok',    label: 'TikTok' },
]

const FORMAT_LABEL: Record<IdeaFormatoSugerido, string> = {
  carrossel:    'Carrossel',
  reels:        'Reels',
  imagem_unica: 'Imagem',
  stories:      'Stories',
  texto:        'Texto',
  video:        'Vídeo',
  live:         'Live',
  indefinido:   '—',
}

const PLATFORM_LABEL: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  linkedin:  'LinkedIn',
  twitter:   'Twitter / X',
  facebook:  'Facebook',
  tiktok:    'TikTok',
}

const PRIORITY_CONFIG: Record<IdeaPrioridade, { label: string; className: string }> = {
  baixa: { label: 'Baixa',  className: 'text-slate-500' },
  media: { label: 'Média',  className: 'text-amber-400' },
  alta:  { label: 'Alta',   className: 'text-orange-400' },
}

const STATUS_LABELS: Record<IdeaStatus, string> = {
  ideia:     'Ideia',
  rascunho:  'Rascunho',
  arquivado: 'Arquivado',
}

function formatRelative(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000 / 60 / 60)
  if (diff < 1) return 'agora'
  if (diff < 24) return `há ${diff}h`
  const days = Math.floor(diff / 24)
  if (days < 7) return `há ${days}d`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

// ── IdeaFormModal ──────────────────────────────────────────────────────────────

interface IdeaFormModalProps {
  brandId:  number
  pillars:  { id: number; name: string }[]
  initial?: Idea
  onClose:  () => void
}

function IdeaFormModal({ brandId, pillars, initial, onClose }: IdeaFormModalProps) {
  const isEdit = !!initial

  const [title,       setTitle]       = useState(initial?.title       ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [formato,     setFormato]     = useState<IdeaFormatoSugerido>(
    initial?.formato_sugerido ?? 'indefinido',
  )
  const [plataforma,  setPlataforma]  = useState<SocialPlatform | ''>(
    initial?.plataforma ?? '',
  )
  const [prioridade,  setPrioridade]  = useState<IdeaPrioridade>(
    initial?.prioridade ?? 'media',
  )
  const [pillarId,    setPillarId]    = useState<number | ''>(
    initial?.pillar_id ?? '',
  )
  const [status,      setStatus]      = useState<IdeaStatus>(
    initial?.status ?? 'ideia',
  )
  const [tagsRaw,     setTagsRaw]     = useState(
    initial?.tags?.join(', ') ?? '',
  )

  const createIdea = useCreateIdea()
  const updateIdea = useUpdateIdea(initial?.id ?? 0)
  const isPending  = createIdea.isPending || updateIdea.isPending

  function parseTags(raw: string) {
    return raw.split(',').map((t) => t.trim()).filter(Boolean)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    if (isEdit) {
      const updatePayload: UpdateIdeaPayload = {
        title:            title.trim(),
        description:      description.trim() || undefined,
        formato_sugerido: formato,
        prioridade,
        pillar_id:        pillarId || null,
        status,
      }
      updateIdea.mutate(updatePayload, { onSuccess: onClose })
    } else {
      const createPayload: CreateIdeaPayload = {
        brand_id:         brandId,
        pillar_id:        pillarId || undefined,
        title:            title.trim(),
        description:      description.trim() || undefined,
        formato_sugerido: formato,
        prioridade,
      }
      createIdea.mutate(createPayload, { onSuccess: onClose })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#111118] border border-[#27273A] rounded-xl w-[560px] shadow-modal animate-fade-up max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E1E2A] flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              {isEdit ? 'Editar ideia' : 'Nova ideia'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEdit ? 'Atualize os dados desta ideia.' : 'Adicione uma nova ideia ao banco de conteúdo.'}
            </p>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-600 hover:text-slate-400 hover:bg-[#17171F] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">

            {/* Título */}
            <div>
              <label className="field-label block mb-1.5">
                Título <span className="text-red-500 normal-case text-xs ml-0.5">*</span>
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: 5 erros que todo iniciante comete no Instagram"
                className="input"
                autoFocus
                required
              />
            </div>

            {/* Descrição */}
            <div>
              <label className="field-label block mb-1.5">Descrição</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Contexto, ângulo, pontos principais a abordar…"
                className="input h-auto py-2.5 resize-none leading-relaxed"
              />
            </div>

            {/* Row: Formato + Prioridade */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label block mb-1.5">Formato</label>
                <select
                  value={formato}
                  onChange={(e) => setFormato(e.target.value as IdeaFormatoSugerido)}
                  className="input"
                >
                  {FORMAT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label block mb-1.5">Prioridade</label>
                <select
                  value={prioridade}
                  onChange={(e) => setPrioridade(e.target.value as IdeaPrioridade)}
                  className="input"
                >
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                </select>
              </div>
            </div>

            {/* Row: Plataforma + Pilar */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label block mb-1.5">Plataforma</label>
                <select
                  value={plataforma}
                  onChange={(e) => setPlataforma(e.target.value as SocialPlatform | '')}
                  className="input"
                >
                  <option value="">Todas</option>
                  {PLATFORM_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label block mb-1.5">Pilar</label>
                <select
                  value={pillarId}
                  onChange={(e) => setPillarId(e.target.value ? Number(e.target.value) : '')}
                  className="input"
                >
                  <option value="">Sem pilar</option>
                  {pillars.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status (edit only) */}
            {isEdit && (
              <div>
                <label className="field-label block mb-1.5">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as IdeaStatus)}
                  className="input"
                >
                  <option value="ideia">Ideia</option>
                  <option value="rascunho">Rascunho</option>
                  <option value="arquivado">Arquivado</option>
                </select>
              </div>
            )}

            {/* Tags */}
            <div>
              <label className="field-label block mb-1.5">Tags</label>
              <input
                value={tagsRaw}
                onChange={(e) => setTagsRaw(e.target.value)}
                placeholder="Ex.: growth, instagram, dicas (separadas por vírgula)"
                className="input"
              />
              <p className="text-[11px] text-slate-600 mt-1">Separe as tags com vírgula.</p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#1E1E2A] flex-shrink-0">
            <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
            <button type="submit" disabled={isPending || !title.trim()} className="btn-primary min-w-[120px]">
              {isPending
                ? <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Salvando…
                  </span>
                : isEdit ? 'Salvar alterações' : 'Criar ideia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── DeleteIdeaModal ────────────────────────────────────────────────────────────

interface DeleteIdeaModalProps {
  idea:    Idea
  onClose: () => void
  onDelete:() => void
  loading: boolean
}

function DeleteIdeaModal({ idea, onClose, onDelete, loading }: DeleteIdeaModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#111118] border border-[#27273A] rounded-xl w-[400px] shadow-modal animate-fade-up">
        <div className="px-6 py-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-red-950/40 border border-red-900/30 flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Excluir ideia</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Tem certeza que deseja excluir{' '}
                <span className="text-slate-200 font-medium">"{idea.title}"</span>?
              </p>
            </div>
          </div>
          <div className="bg-red-950/20 border border-red-900/20 rounded-lg px-3.5 py-2.5">
            <p className="text-[11px] text-red-400 leading-relaxed">Esta ação não pode ser desfeita.</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#1E1E2A]">
          <button onClick={onClose} className="btn-ghost">Cancelar</button>
          <button onClick={onDelete} disabled={loading} className="btn-danger min-w-[100px]">
            {loading
              ? <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                  Excluindo…
                </span>
              : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── ConvertToPostModal ─────────────────────────────────────────────────────────

interface ConvertToPostModalProps {
  idea:     Idea
  onClose:  () => void
  onConfirm:() => void
  loading:  boolean
  success:  boolean
}

function ConvertToPostModal({ idea, onClose, onConfirm, loading, success }: ConvertToPostModalProps) {
  const router = useRouter()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#111118] border border-[#27273A] rounded-xl w-[420px] shadow-modal animate-fade-up">
        {success ? (
          <>
            <div className="px-6 py-8 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-950/40 border border-emerald-900/30 flex items-center justify-center">
                <Check className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-100">Post criado com sucesso!</h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Um rascunho de post foi gerado a partir da ideia.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 px-6 py-4 border-t border-[#1E1E2A]">
              <button onClick={onClose} className="btn-ghost">Fechar</button>
              <button onClick={() => router.push('/posts')} className="btn-primary">
                <FileText className="w-3.5 h-3.5" />
                Ver posts
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="px-6 py-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-600/15 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                  <ArrowRight className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-100">Converter em post</h2>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Isso criará um rascunho de post baseado em{' '}
                    <span className="text-slate-200 font-medium">"{idea.title}"</span>.
                    Você poderá editar o conteúdo antes de publicar.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#1E1E2A]">
              <button onClick={onClose} disabled={loading} className="btn-ghost">Cancelar</button>
              <button onClick={onConfirm} disabled={loading} className="btn-primary min-w-[120px]">
                {loading
                  ? <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Convertendo…
                    </span>
                  : 'Converter'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── IdeaDetailPanel ────────────────────────────────────────────────────────────

interface IdeaDetailPanelProps {
  idea:           Idea
  pillars:        { id: number; name: string }[]
  onClose:        () => void
  onEdit:         () => void
  onDelete:       () => void
  onConvert:      () => void
}

function IdeaDetailPanel({ idea, pillars, onClose, onEdit, onDelete, onConvert }: IdeaDetailPanelProps) {
  const pillarName = pillars.find((p) => p.id === idea.pillar_id)?.name ?? null

  return (
    <div className="w-[340px] border-l border-[#1E1E2A] flex flex-col bg-[#0C0C11] flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E1E2A]">
        <span className="text-[13px] font-semibold text-slate-200">Detalhe</span>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#17171F] text-slate-500 hover:text-slate-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">

        {/* Title */}
        <div>
          <h3 className="text-[13px] font-semibold text-slate-100 leading-snug">
            {idea.title}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">{formatRelative(idea.created_at)}</p>
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
          <div>
            <p className="field-label mb-1">Status</p>
            <StatusBadge status={idea.status} />
          </div>
          <div>
            <p className="field-label mb-1">Prioridade</p>
            <span className={cn('text-[12px] font-medium', PRIORITY_CONFIG[idea.prioridade].className)}>
              {PRIORITY_CONFIG[idea.prioridade].label}
            </span>
          </div>
          <div>
            <p className="field-label mb-1">Formato</p>
            <span className="text-[12px] text-slate-400">{FORMAT_LABEL[idea.formato_sugerido]}</span>
          </div>
          <div>
            <p className="field-label mb-1">Plataforma</p>
            <span className="text-[12px] text-slate-400">
              {idea.plataforma ? PLATFORM_LABEL[idea.plataforma] : '—'}
            </span>
          </div>
          {pillarName && (
            <div className="col-span-2">
              <p className="field-label mb-1">Pilar</p>
              <span className="text-[12px] text-slate-400">{pillarName}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {idea.description && (
          <div>
            <p className="field-label mb-2">Descrição</p>
            <p className="text-[12px] text-slate-400 leading-relaxed">{idea.description}</p>
          </div>
        )}

        {/* Tags */}
        {idea.tags && idea.tags.length > 0 && (
          <div>
            <p className="field-label mb-2">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {idea.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-[11px] bg-[#17171F] border border-[#27273A] rounded text-slate-500"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="p-4 border-t border-[#1E1E2A] space-y-2">
        <button
          onClick={onConvert}
          className="btn-primary w-full justify-center"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          Converter em post
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onEdit} className="btn-secondary justify-center">
            <Pencil className="w-3.5 h-3.5" />
            Editar
          </button>
          <button
            onClick={onDelete}
            className={cn(
              'btn',
              'bg-transparent border border-[#27273A] text-slate-500',
              'hover:border-red-900/50 hover:text-red-400 hover:bg-red-950/20',
              'transition-colors',
            )}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Excluir
          </button>
        </div>
      </div>
    </div>
  )
}

// ── RowMenu ────────────────────────────────────────────────────────────────────

interface RowMenuProps {
  onEdit:    () => void
  onDelete:  () => void
  onConvert: () => void
}

function RowMenu({ onEdit, onDelete, onConvert }: RowMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        className="w-7 h-7 flex items-center justify-center rounded-md text-slate-600 hover:text-slate-400 hover:bg-[#17171F] transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-[#111118] border border-[#27273A] rounded-lg shadow-modal z-20 animate-fade-up overflow-hidden">
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); onConvert() }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-slate-300 hover:bg-[#17171F] hover:text-slate-100 transition-colors"
          >
            <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
            Converter em post
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit() }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-slate-300 hover:bg-[#17171F] hover:text-slate-100 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5 text-slate-500" />
            Editar
          </button>
          <div className="border-t border-[#1E1E2A] my-0.5" />
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete() }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-red-400 hover:bg-red-950/40 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Excluir
          </button>
        </div>
      )}
    </div>
  )
}

// ── IdeasPage ──────────────────────────────────────────────────────────────────

export default function IdeasPage() {
  const router      = useRouter()
  const activeBrand = useBrandStore((s) => s.activeBrand)
  const brandId     = activeBrand?.id ?? 0

  const { data: ideas   = [], isLoading } = useIdeas(brandId)
  const { data: pillars = []           }  = usePillars(brandId)
  const deleteIdea  = useDeleteIdea()

  // selectedId drives top-level hooks (rule: no conditional hooks)
  const [selectedId,   setSelectedId]   = useState<number | null>(null)
  const ideaToPost = useIdeaToPost(selectedId ?? 0)

  const selectedIdea = ideas.find((i) => i.id === selectedId) ?? null

  // Modals
  const [createOpen,   setCreateOpen]   = useState(false)
  const [editTarget,   setEditTarget]   = useState<Idea | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Idea | null>(null)
  const [convertTarget,setConvertTarget]= useState<Idea | null>(null)
  const [convertDone,  setConvertDone]  = useState(false)

  // Filters
  const [statusFilter,   setStatusFilter]   = useState<IdeaStatus | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<IdeaPrioridade | 'all'>('all')
  const [search,         setSearch]         = useState('')

  const filtered = ideas.filter((i) => {
    if (statusFilter !== 'all' && i.status !== statusFilter) return false
    if (priorityFilter !== 'all' && i.prioridade !== priorityFilter) return false
    if (search && !i.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    deleteIdea.mutate(deleteTarget.id, {
      onSuccess: () => {
        if (selectedId === deleteTarget.id) setSelectedId(null)
        setDeleteTarget(null)
      },
    })
  }

  function openConvert(idea: Idea) {
    setConvertDone(false)
    setConvertTarget(idea)
    // ensure selectedId matches for useIdeaToPost
    setSelectedId(idea.id)
  }

  function handleConvertConfirm() {
    ideaToPost.mutate(undefined, {
      onSuccess: () => setConvertDone(true),
    })
  }

  function closeConvert() {
    setConvertTarget(null)
    setConvertDone(false)
  }

  // ── No brand selected ──────────────────────────────────────────────────────
  if (!brandId) {
    return (
      <div className="flex-1 p-6">
        <EmptyState
          icon={Lightbulb}
          title="Nenhuma marca selecionada"
          description="Selecione uma marca na barra lateral para ver as ideias."
        />
      </div>
    )
  }

  return (
    <>
      {/* Modals */}
      {createOpen && (
        <IdeaFormModal
          brandId={brandId}
          pillars={pillars}
          onClose={() => setCreateOpen(false)}
        />
      )}
      {editTarget && (
        <IdeaFormModal
          brandId={brandId}
          pillars={pillars}
          initial={editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}
      {deleteTarget && (
        <DeleteIdeaModal
          idea={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDelete={handleDeleteConfirm}
          loading={deleteIdea.isPending}
        />
      )}
      {convertTarget && (
        <ConvertToPostModal
          idea={convertTarget}
          onClose={closeConvert}
          onConfirm={handleConvertConfirm}
          loading={ideaToPost.isPending}
          success={convertDone}
        />
      )}

      <div className="flex h-full overflow-hidden">

        {/* ── Main ──────────────────────────────────────────────────────────── */}
        <div className="flex-1 p-6 min-w-0 overflow-y-auto">
          <PageHeader
            title="Ideias"
            subtitle={`${ideas.length} ideia${ideas.length !== 1 ? 's' : ''} no banco de conteúdo`}
            className="mb-6"
          >
            <button
              onClick={() => router.push('/generate')}
              className="btn-secondary"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Gerar com IA
            </button>
            <button onClick={() => setCreateOpen(true)} className="btn-primary">
              <Plus className="w-3.5 h-3.5" />
              Nova ideia
            </button>
          </PageHeader>

          {/* Filters */}
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            {/* Status tabs */}
            <div className="flex items-center gap-0.5 bg-[#111118] border border-[#27273A] rounded-lg p-1">
              {(['all', 'ideia', 'rascunho', 'arquivado'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    'px-3 py-1 rounded-md text-[12px] font-medium transition-colors',
                    statusFilter === s
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-500 hover:text-slate-300',
                  )}
                >
                  {s === 'all' ? 'Todos' : STATUS_LABELS[s as IdeaStatus]}
                </button>
              ))}
            </div>

            {/* Priority */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as IdeaPrioridade | 'all')}
              className="input h-8 w-auto px-2.5 text-[12px]"
            >
              <option value="all">Prioridade: Todas</option>
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </select>

            {/* Search */}
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título…"
              className="input h-8 w-[200px] text-[12px]"
            />

            {/* Active filter chips */}
            {statusFilter !== 'all' && (
              <button
                onClick={() => setStatusFilter('all')}
                className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600/15 border border-indigo-500/30 rounded-md text-[12px] text-indigo-400 hover:bg-indigo-600/25 transition-colors"
              >
                {STATUS_LABELS[statusFilter as IdeaStatus]}
                <X className="w-3 h-3" />
              </button>
            )}

            <span className="ml-auto text-[12px] text-slate-600">
              {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="card overflow-hidden animate-pulse">
              {[0,1,2,3,4].map((i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-[#1E1E2A] last:border-0">
                  <div className="h-3 bg-[#17171F] rounded flex-1" />
                  <div className="h-3 bg-[#17171F] rounded w-16" />
                  <div className="h-3 bg-[#17171F] rounded w-16" />
                  <div className="h-3 bg-[#17171F] rounded w-16" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Lightbulb}
              title={ideas.length === 0 ? 'Nenhuma ideia criada' : 'Nenhum resultado'}
              description={
                ideas.length === 0
                  ? 'Crie sua primeira ideia ou gere com IA.'
                  : 'Ajuste os filtros para encontrar ideias.'
              }
              action={
                ideas.length === 0
                  ? { label: '+ Nova ideia', onClick: () => setCreateOpen(true) }
                  : undefined
              }
            />
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-th">Título</th>
                    <th className="table-th w-24">Formato</th>
                    <th className="table-th w-24">Prioridade</th>
                    <th className="table-th w-28">Status</th>
                    <th className="table-th w-20">Criado</th>
                    <th className="table-th w-10" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((idea) => {
                    const pillarName = pillars.find((p) => p.id === idea.pillar_id)?.name
                    const isSelected = selectedId === idea.id
                    return (
                      <tr
                        key={idea.id}
                        onClick={() => setSelectedId(isSelected ? null : idea.id)}
                        className={cn(
                          'table-tr cursor-pointer',
                          isSelected && 'bg-indigo-600/5',
                        )}
                      >
                        <td className="table-td">
                          <p className="text-[13px] text-slate-200 font-medium line-clamp-1">
                            {idea.title}
                          </p>
                          {pillarName && (
                            <p className="text-[11px] text-slate-600 mt-0.5">{pillarName}</p>
                          )}
                          {idea.tags && idea.tags.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {idea.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="text-[10px] text-slate-600">
                                  #{tag}
                                </span>
                              ))}
                              {idea.tags.length > 3 && (
                                <span className="text-[10px] text-slate-700">
                                  +{idea.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="table-td text-[12px] text-slate-500">
                          {FORMAT_LABEL[idea.formato_sugerido]}
                        </td>
                        <td className="table-td">
                          <span className={cn('text-[12px] font-medium', PRIORITY_CONFIG[idea.prioridade].className)}>
                            {PRIORITY_CONFIG[idea.prioridade].label}
                          </span>
                        </td>
                        <td className="table-td">
                          <StatusBadge status={idea.status} />
                        </td>
                        <td className="table-td text-[12px] text-slate-600">
                          {formatRelative(idea.created_at)}
                        </td>
                        <td className="table-td">
                          <RowMenu
                            onEdit={() => setEditTarget(idea)}
                            onDelete={() => setDeleteTarget(idea)}
                            onConvert={() => openConvert(idea)}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Detail panel ──────────────────────────────────────────────────── */}
        {selectedIdea && (
          <IdeaDetailPanel
            idea={selectedIdea}
            pillars={pillars}
            onClose={() => setSelectedId(null)}
            onEdit={() => setEditTarget(selectedIdea)}
            onDelete={() => setDeleteTarget(selectedIdea)}
            onConvert={() => openConvert(selectedIdea)}
          />
        )}
      </div>
    </>
  )
}
