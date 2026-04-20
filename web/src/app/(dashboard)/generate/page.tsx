'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sparkles, Zap, ChevronDown, CheckCircle2, FileText,
  Trash2, AlertCircle, RefreshCw, Instagram, Linkedin,
  ArrowRight, Lightbulb, LayoutGrid, Info, Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useBrandStore }  from '@/store/brandStore'
import { useBrands, usePillars } from '@/hooks/useBrands'
import { ideaService }    from '@/services/ideaService'
import { parseApiError }  from '@/lib/api/errors'
import { toast }          from '@/store/uiStore'
import { queryClient, queryKeys } from '@/lib/api/queryClient'
import type { Idea, SocialPlatform, IdeaFormatoSugerido, IdeaPrioridade } from '@/types'
import type { IdeaObjetivo } from '@/services/ideaService'

// ── Constants ────────────────────────────────────────────────────────────────

const OBJETIVOS: { key: IdeaObjetivo; label: string; desc: string; icon: string }[] = [
  { key: 'engajamento',    label: 'Engajamento',    desc: 'Curtidas, comentários e compartilhamentos', icon: '🔥' },
  { key: 'educacao',       label: 'Educação',       desc: 'Ensinar e agregar valor ao público',        icon: '📚' },
  { key: 'vendas',         label: 'Vendas',         desc: 'Gerar interesse e conversões diretas',      icon: '💰' },
  { key: 'awareness',      label: 'Awareness',      desc: 'Ampliar alcance e reconhecimento de marca', icon: '📡' },
  { key: 'autoridade',     label: 'Autoridade',     desc: 'Posicionar como referência no nicho',       icon: '🏆' },
  { key: 'entretenimento', label: 'Entretenimento', desc: 'Divertir e conectar com a audiência',       icon: '🎭' },
]

const PLATAFORMAS: { key: SocialPlatform; label: string; color: string; bg: string; icon: React.ReactNode }[] = [
  { key: 'instagram', label: 'Instagram', color: 'text-violet-400', bg: 'border-violet-500/40 bg-violet-500/10', icon: <Instagram className="w-3.5 h-3.5" /> },
  { key: 'linkedin',  label: 'LinkedIn',  color: 'text-blue-400',   bg: 'border-blue-500/40 bg-blue-500/10',    icon: <Linkedin  className="w-3.5 h-3.5" /> },
  { key: 'tiktok',    label: 'TikTok',    color: 'text-pink-400',   bg: 'border-pink-500/40 bg-pink-500/10',   icon: <span className="text-[11px] font-black">T</span> },
  { key: 'twitter',   label: 'Twitter',   color: 'text-sky-400',    bg: 'border-sky-500/40 bg-sky-500/10',     icon: <span className="text-[11px] font-black">𝕏</span> },
  { key: 'facebook',  label: 'Facebook',  color: 'text-blue-500',   bg: 'border-blue-600/40 bg-blue-600/10',   icon: <span className="text-[11px] font-black">f</span> },
]

const FORMATOS: { key: IdeaFormatoSugerido; label: string; desc: string }[] = [
  { key: 'carrossel',   label: 'Carrossel',  desc: 'Múltiplos slides' },
  { key: 'reels',       label: 'Reels',      desc: 'Vídeo curto' },
  { key: 'imagem_unica',label: 'Imagem',     desc: 'Post estático' },
  { key: 'stories',     label: 'Stories',   desc: 'Conteúdo efêmero' },
  { key: 'texto',       label: 'Texto',      desc: 'Post escrito' },
  { key: 'video',       label: 'Vídeo',      desc: 'Vídeo longo' },
]

const QUANTIDADES = [3, 5, 7, 10]

const PRIORITY_CONFIG: Record<IdeaPrioridade, { label: string; color: string; dot: string }> = {
  baixa:  { label: 'Baixa',  color: 'text-slate-400',  dot: 'bg-slate-500'   },
  media:  { label: 'Média',  color: 'text-amber-400',  dot: 'bg-amber-400'   },
  alta:   { label: 'Alta',   color: 'text-orange-400', dot: 'bg-orange-400'  },
}

const FORMAT_LABEL: Record<string, string> = {
  carrossel: 'Carrossel', reels: 'Reels', imagem_unica: 'Imagem',
  stories: 'Stories', texto: 'Texto', video: 'Vídeo', live: 'Live', indefinido: '—',
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FormLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[11px] font-semibold tracking-widest uppercase text-slate-500 mb-2">
      {children}
      {required && <span className="text-indigo-400 ml-0.5">*</span>}
    </label>
  )
}

function SelectChip({
  active, onClick, children, className,
}: {
  active: boolean; onClick: () => void; children: React.ReactNode; className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-all',
        active
          ? 'border-indigo-500/70 bg-indigo-600/15 text-indigo-300 shadow-[0_0_0_1px_rgba(99,102,241,0.3)]'
          : 'border-slate-300 bg-slate-50 text-slate-500 hover:border-slate-300 hover:text-slate-400',
        className,
      )}
    >
      {children}
    </button>
  )
}

function SkeletonCard({ index }: { index: number }) {
  return (
    <div
      className="card p-5 space-y-3 animate-pulse"
      style={{ animationDelay: `${index * 120}ms` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <div className="h-5 w-16 bg-slate-200 rounded-full" />
          <div className="h-5 w-20 bg-slate-200 rounded-full" />
        </div>
        <div className="h-5 w-10 bg-slate-200 rounded" />
      </div>
      <div className="h-5 w-3/4 bg-slate-200 rounded" />
      <div className="space-y-1.5">
        <div className="h-3.5 w-full bg-slate-200 rounded" />
        <div className="h-3.5 w-5/6 bg-slate-200 rounded" />
        <div className="h-3.5 w-4/6 bg-slate-200 rounded" />
      </div>
      <div className="h-9 bg-slate-200 rounded-md mt-2" />
      <div className="flex gap-2 pt-1 border-t border-slate-200">
        <div className="h-7 flex-1 bg-slate-200 rounded-md" />
        <div className="h-7 flex-1 bg-slate-200 rounded-md" />
        <div className="h-7 w-8 bg-slate-200 rounded-md" />
      </div>
    </div>
  )
}

interface IdeaCardProps {
  idea:        Idea
  index:       number
  onToPost:    (id: number) => Promise<import('@/types').Post | null>
  onDiscard:   (id: number) => void
}

function IdeaCard({ idea, index, onToPost, onDiscard }: IdeaCardProps) {
  const [toPostLoading, setToPostLoading] = useState(false)
  const [converted, setConverted]         = useState(false)
  const [createdPost, setCreatedPost]     = useState<import('@/types').Post | null>(null)
  const [discarded, setDiscarded]         = useState(false)
  const router                            = useRouter()

  const plat = PLATAFORMAS.find((p) => p.key === idea.plataforma) ?? null
  const prio = PRIORITY_CONFIG[idea.prioridade]

  async function handleToPost() {
    setToPostLoading(true)
    try {
      const post = await onToPost(idea.id)
      setCreatedPost(post)
      setConverted(true)
    } finally {
      setToPostLoading(false)
    }
  }

  function handleDiscard() {
    setDiscarded(true)
    setTimeout(() => onDiscard(idea.id), 300)
  }

  return (
    <div
      className={cn(
        'card p-5 flex flex-col gap-3 transition-all duration-300 group',
        converted && 'opacity-60 border-emerald-500/20',
        discarded && 'opacity-0 scale-95 pointer-events-none',
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center flex-wrap gap-1.5">
          {/* Index */}
          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-300 rounded px-1.5 py-0.5">
            #{String(index + 1).padStart(2, '0')}
          </span>
          {/* Platform chip */}
          {plat && (
            <span className={cn('flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border', plat.bg, plat.color)}>
              {plat.icon} {plat.label}
            </span>
          )}
          {/* Format chip */}
          <span className="text-[11px] text-slate-400 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-full">
            {FORMAT_LABEL[idea.formato_sugerido]}
          </span>
        </div>

        {/* Priority */}
        <div className={cn('flex items-center gap-1 text-[11px] font-medium flex-shrink-0', prio.color)}>
          <div className={cn('w-1.5 h-1.5 rounded-full', prio.dot)} />
          {prio.label}
        </div>
      </div>

      {/* Title */}
      <h3 className={cn(
        'text-[15px] font-semibold text-slate-900 leading-snug',
        converted && 'line-through decoration-emerald-500/60'
      )}>
        {idea.title}
      </h3>

      {/* Description */}
      {idea.description && (
        <p className="text-sm text-slate-400 leading-relaxed line-clamp-3">
          {idea.description}
        </p>
      )}

      {/* Hook (first sentence of description) */}
      {idea.description && (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-indigo-600/5 border border-indigo-500/15 rounded-md">
          <Lightbulb className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-indigo-300 leading-snug italic">
            {idea.description.split('.')[0].trim()}.
          </p>
        </div>
      )}

      {/* Converted banner */}
      {converted && (
        <div className="flex flex-col gap-2 px-3 py-2.5 bg-emerald-500/8 border border-emerald-500/20 rounded-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span className="text-xs text-emerald-400 font-semibold">Rascunho criado com sucesso</span>
          </div>
          {createdPost?.caption && (
            <p className="text-[11px] text-slate-400 leading-snug line-clamp-3 pl-5">
              {createdPost.caption}
            </p>
          )}
          <button
            onClick={() => router.push('/posts')}
            className="ml-5 flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
          >
            Ver em Posts <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Actions */}
      {!converted && (
        <div className="flex items-center gap-2 pt-1 border-t border-slate-200">
          <button
            onClick={handleToPost}
            disabled={toPostLoading}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors"
          >
            {toPostLoading ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin" />
                Criando…
              </>
            ) : (
              <>
                <FileText className="w-3 h-3" />
                Criar Post
              </>
            )}
          </button>

          <button
            onClick={handleDiscard}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-slate-300 bg-transparent hover:border-red-500/40 hover:bg-red-500/8 hover:text-red-400 text-slate-500 text-xs font-medium transition-all"
            title="Descartar ideia"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type GenState = 'idle' | 'loading' | 'results' | 'error'

interface FormData {
  brandId:    number | null
  pillarId:   number | null
  tema:       string
  objetivo:   IdeaObjetivo | null
  plataforma: SocialPlatform | null
  formato:    IdeaFormatoSugerido | null
  quantidade: number
  contexto:   string
}

export default function GeneratePage() {
  const router = useRouter()

  // Stores
  const activeBrand    = useBrandStore((s) => s.activeBrand)
  const setActiveBrand = useBrandStore((s) => s.setActiveBrand)

  // API data
  const { data: brands = [] }                                  = useBrands()
  const [formBrandId, setFormBrandId]                         = useState<number | null>(activeBrand?.id ?? null)
  const { data: pillars = [] }                                 = usePillars(formBrandId ?? 0)

  // Form state
  const [form, setForm] = useState<FormData>({
    brandId:    activeBrand?.id ?? null,
    pillarId:   null,
    tema:       '',
    objetivo:   null,
    plataforma: null,
    formato:    null,
    quantidade: 5,
    contexto:   '',
  })

  // Generation state
  const [genState,  setGenState]  = useState<GenState>('idle')
  const [ideas,     setIdeas]     = useState<Idea[]>([])
  const [genError,  setGenError]  = useState<string | null>(null)
  const resultsRef                = useRef<HTMLDivElement>(null)

  // ── Derived ──
  const selectedBrand = brands.find((b) => b.id === form.brandId) ?? null
  const canGenerate   = !!form.brandId && !!form.tema.trim()

  function patch(partial: Partial<FormData>) {
    setForm((prev) => ({ ...prev, ...partial }))
  }

  function handleBrandChange(id: number) {
    patch({ brandId: id, pillarId: null })
    setFormBrandId(id)
    const brand = brands.find((b) => b.id === id)
    if (brand) setActiveBrand(brand)
  }

  // ── Generation ──
  const handleGenerate = useCallback(async () => {
    if (!canGenerate || !form.brandId) return

    setGenState('loading')
    setGenError(null)
    setIdeas([])

    // Scroll to results on mobile
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)

    try {
      const generated = await ideaService.generate({
        brand_id:   form.brandId,
        pillar_id:  form.pillarId ?? undefined,
        quantidade: form.quantidade,
        tema:       form.tema,
        objetivo:   form.objetivo ?? undefined,
        plataforma: form.plataforma ?? undefined,
        formato:    form.formato ?? undefined,
        contexto:   form.contexto || undefined,
      })

      setIdeas(generated)
      setGenState('results')

      // Invalidate ideas cache so the Ideas page reflects new content
      queryClient.invalidateQueries({ queryKey: queryKeys.ideas(form.brandId) })

      toast.success(`${generated.length} ideias geradas com sucesso.`)
    } catch (err) {
      setGenError(parseApiError(err))
      setGenState('error')
    }
  }, [form, canGenerate])

  async function handleToPost(ideaId: number): Promise<import('@/types').Post | null> {
    try {
      const post = await ideaService.toPost(ideaId)
      queryClient.invalidateQueries({ queryKey: form.brandId ? queryKeys.posts(form.brandId) : ['posts'] })
      return post
    } catch (err) {
      toast.error(parseApiError(err))
      return null
    }
  }

  function handleDiscard(ideaId: number) {
    setIdeas((prev) => prev.filter((i) => i.id !== ideaId))
    ideaService.delete(ideaId).catch(() => {/* silent */})
  }

  function handleReset() {
    setGenState('idle')
    setIdeas([])
    setGenError(null)
  }

  // ── Render ──
  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left: Configuration Form ──────────────────────────────────────────── */}
      <aside className="w-[420px] flex-shrink-0 border-r border-slate-200 flex flex-col overflow-y-auto bg-white">

        {/* Panel header */}
        <div className="px-6 py-5 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center flex-shrink-0">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <h1 className="text-[15px] font-semibold text-slate-900">Gerar Conteúdo</h1>
          </div>
          <p className="text-xs text-slate-500 ml-9">
            Configure os parâmetros e a IA criará ideias personalizadas para sua marca.
          </p>
        </div>

        {/* Form body */}
        <div className="flex-1 px-6 py-5 space-y-5">

          {/* Marca */}
          <div>
            <FormLabel required>Marca</FormLabel>
            <div className="relative">
              <select
                value={form.brandId ?? ''}
                onChange={(e) => handleBrandChange(Number(e.target.value))}
                className="input w-full appearance-none pr-8"
              >
                <option value="" disabled>Selecionar marca…</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 pointer-events-none" />
            </div>
            {selectedBrand?.description && (
              <p className="mt-1.5 text-[11px] text-slate-600 leading-snug line-clamp-2">
                {selectedBrand.description}
              </p>
            )}
          </div>

          {/* Pilar de Conteúdo */}
          {pillars.length > 0 && (
            <div>
              <FormLabel>Pilar de Conteúdo</FormLabel>
              <div className="flex flex-wrap gap-1.5">
                <SelectChip
                  active={form.pillarId === null}
                  onClick={() => patch({ pillarId: null })}
                >
                  Todos os pilares
                </SelectChip>
                {pillars.map((p) => (
                  <SelectChip
                    key={p.id}
                    active={form.pillarId === p.id}
                    onClick={() => patch({ pillarId: p.id })}
                  >
                    {p.name}
                  </SelectChip>
                ))}
              </div>
            </div>
          )}

          {/* Tema */}
          <div>
            <FormLabel required>Tema</FormLabel>
            <input
              type="text"
              value={form.tema}
              onChange={(e) => patch({ tema: e.target.value })}
              placeholder="Ex: produtividade para empreendedores"
              className="input w-full"
              maxLength={120}
            />
            <p className="mt-1 text-[11px] text-slate-600">
              Seja específico — melhores temas geram melhores ideias.
            </p>
          </div>

          {/* Objetivo */}
          <div>
            <FormLabel>Objetivo</FormLabel>
            <div className="grid grid-cols-2 gap-1.5">
              {OBJETIVOS.map((obj) => (
                <button
                  key={obj.key}
                  type="button"
                  onClick={() => patch({ objetivo: form.objetivo === obj.key ? null : obj.key })}
                  className={cn(
                    'flex items-start gap-2 p-2.5 rounded-md border text-left transition-all',
                    form.objetivo === obj.key
                      ? 'border-indigo-500/60 bg-indigo-600/10 text-indigo-300'
                      : 'border-slate-300 bg-slate-50 text-slate-500 hover:border-slate-300 hover:text-slate-400',
                  )}
                >
                  <span className="text-base leading-none mt-0.5">{obj.icon}</span>
                  <div>
                    <p className="text-xs font-semibold leading-tight">{obj.label}</p>
                    <p className="text-[10px] leading-snug mt-0.5 opacity-70">{obj.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Plataforma */}
          <div>
            <FormLabel>Plataforma</FormLabel>
            <div className="flex flex-wrap gap-1.5">
              {PLATAFORMAS.map((p) => (
                <SelectChip
                  key={p.key}
                  active={form.plataforma === p.key}
                  onClick={() => patch({ plataforma: form.plataforma === p.key ? null : p.key })}
                  className={form.plataforma === p.key ? p.bg : ''}
                >
                  <span className={cn('flex items-center', form.plataforma === p.key ? p.color : '')}>
                    {p.icon}
                  </span>
                  <span className={form.plataforma === p.key ? p.color : ''}>{p.label}</span>
                </SelectChip>
              ))}
            </div>
          </div>

          {/* Formato */}
          <div>
            <FormLabel>Formato</FormLabel>
            <div className="flex flex-wrap gap-1.5">
              {FORMATOS.map((f) => (
                <SelectChip
                  key={f.key}
                  active={form.formato === f.key}
                  onClick={() => patch({ formato: form.formato === f.key ? null : f.key })}
                >
                  <LayoutGrid className="w-3 h-3 opacity-60" />
                  {f.label}
                </SelectChip>
              ))}
            </div>
          </div>

          {/* Quantidade */}
          <div>
            <FormLabel>Quantidade de Ideias</FormLabel>
            <div className="flex gap-2">
              {QUANTIDADES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => patch({ quantidade: q })}
                  className={cn(
                    'flex-1 h-9 rounded-md border text-sm font-semibold transition-all',
                    form.quantidade === q
                      ? 'border-indigo-500/60 bg-indigo-600/15 text-indigo-300'
                      : 'border-slate-300 bg-slate-50 text-slate-500 hover:border-slate-300 hover:text-slate-400',
                  )}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Contexto adicional */}
          <div>
            <FormLabel>Contexto Adicional</FormLabel>
            <textarea
              value={form.contexto}
              onChange={(e) => patch({ contexto: e.target.value })}
              placeholder="Informações extras para a IA: público-alvo, tom de voz, restrições, exemplos…"
              rows={5}
              className="input w-full resize-y text-sm leading-relaxed min-h-[100px]"
              maxLength={500}
            />
            {form.contexto.length > 0 && (
              <p className="mt-1 text-[10px] text-slate-600 text-right">
                {form.contexto.length}/500
              </p>
            )}
          </div>

        </div>

        {/* Generate button — sticky footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex-shrink-0 bg-white">
          {!canGenerate && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-md bg-slate-50 border border-slate-300">
              <Info className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
              <p className="text-[11px] text-slate-600">
                {!form.brandId ? 'Selecione uma marca.' : 'Defina o tema do conteúdo.'}
              </p>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={!canGenerate || genState === 'loading'}
            className={cn(
              'w-full h-11 flex items-center justify-center gap-2.5 rounded-lg font-semibold text-sm transition-all',
              canGenerate && genState !== 'loading'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-900/30'
                : 'bg-slate-100 border border-slate-300 text-slate-600 cursor-not-allowed',
            )}
          >
            {genState === 'loading' ? (
              <>
                <Sparkles className="w-4 h-4 animate-pulse text-indigo-300" />
                <span>Gerando ideias…</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Gerar com IA</span>
                {form.quantidade > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 bg-white/10 rounded text-[11px]">
                    {form.quantidade} ideias
                  </span>
                )}
              </>
            )}
          </button>

          {genState === 'results' && ideas.length > 0 && (
            <button
              onClick={handleReset}
              className="w-full mt-2 h-8 flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-400 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Nova geração
            </button>
          )}
        </div>
      </aside>

      {/* ── Right: Results Panel ───────────────────────────────────────────────── */}
      <main ref={resultsRef} className="flex-1 overflow-y-auto bg-[#F5F4FB]">

        {/* ── IDLE: Empty state ── */}
        {genState === 'idle' && (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="mb-6 relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-600/20 to-violet-600/20 border border-indigo-500/20 flex items-center justify-center">
                <Sparkles className="w-9 h-9 text-indigo-400" />
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
                <Zap className="w-2.5 h-2.5 text-white" />
              </div>
            </div>

            <h2 className="text-xl font-semibold text-slate-700 mb-2">
              Pronto para gerar conteúdo
            </h2>
            <p className="text-sm text-slate-500 max-w-xs leading-relaxed mb-6">
              Configure os parâmetros no painel à esquerda e a IA criará ideias únicas e alinhadas com a sua marca.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap justify-center gap-2 max-w-sm">
              {[
                '✦ Títulos otimizados',
                '✦ Hooks de abertura',
                '✦ Formato adequado',
                '✦ Alinhado ao pilar',
                '✦ Tom da marca',
              ].map((f) => (
                <span key={f} className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── LOADING: Skeleton cards ── */}
        {genState === 'loading' && (
          <div className="p-6">
            {/* Loading header */}
            <div className="flex items-center gap-3 mb-6 px-5 py-4 bg-indigo-600/5 border border-indigo-500/15 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-semibold text-indigo-300">IA processando sua solicitação</p>
                <p className="text-[11px] text-indigo-400/60 mt-0.5">
                  Analisando marca, tema e objetivo · gerando {form.quantidade} ideias únicas…
                </p>
              </div>
              <div className="ml-auto flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>

            {/* Skeleton cards */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {Array.from({ length: form.quantidade }).map((_, i) => (
                <SkeletonCard key={i} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* ── ERROR state ── */}
        {genState === 'error' && (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5">
              <AlertCircle className="w-7 h-7 text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-700 mb-2">
              Falha na geração
            </h2>
            <p className="text-sm text-red-400 max-w-sm leading-relaxed mb-6">
              {genError ?? 'Não foi possível conectar com o servidor de IA.'}
            </p>
            <button
              onClick={handleGenerate}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Tentar novamente
            </button>
          </div>
        )}

        {/* ── RESULTS ── */}
        {genState === 'results' && (
          <div className="p-6">

            {/* Results header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-slate-700">
                    {ideas.length} {ideas.length === 1 ? 'ideia gerada' : 'ideias geradas'}
                    {form.tema && (
                      <span className="ml-1.5 text-slate-500 font-normal">
                        · tema: <span className="text-slate-400 italic">"{form.tema}"</span>
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Converta em post ou descarte para gerar mais
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push('/posts')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-700 border border-slate-300 hover:border-slate-300 rounded-md transition-all"
                >
                  Ver Posts <ArrowRight className="w-3 h-3" />
                </button>
                <button
                  onClick={handleGenerate}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 hover:border-indigo-500/50 bg-indigo-600/5 rounded-md transition-all"
                >
                  <Zap className="w-3 h-3" />
                  Regerar
                </button>
              </div>
            </div>

            {/* Summary tags */}
            <div className="flex items-center flex-wrap gap-1.5 mb-5">
              {selectedBrand && (
                <span className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">
                  🏷 {selectedBrand.name}
                </span>
              )}
              {form.objetivo && (
                <span className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">
                  {OBJETIVOS.find((o) => o.key === form.objetivo)?.icon}{' '}
                  {OBJETIVOS.find((o) => o.key === form.objetivo)?.label}
                </span>
              )}
              {form.plataforma && (
                <span className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full capitalize">
                  {form.plataforma}
                </span>
              )}
              {form.formato && (
                <span className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">
                  {FORMAT_LABEL[form.formato]}
                </span>
              )}
              <span className="text-[11px] text-slate-600 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Agora
              </span>
            </div>

            {/* Cards grid */}
            {ideas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Trash2 className="w-8 h-8 text-slate-700 mb-3" />
                <p className="text-sm text-slate-500">Todas as ideias foram descartadas.</p>
                <button
                  onClick={handleGenerate}
                  className="mt-4 flex items-center gap-1.5 px-4 py-2 text-xs text-indigo-400 border border-indigo-500/30 rounded-md hover:bg-indigo-600/10 transition-colors"
                >
                  <Zap className="w-3 h-3" />
                  Gerar novas ideias
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {ideas.map((idea, i) => (
                  <IdeaCard
                    key={idea.id}
                    idea={idea}
                    index={i}
                    onToPost={handleToPost}
                    onDiscard={handleDiscard}
                  />
                ))}
              </div>
            )}

          </div>
        )}

      </main>
    </div>
  )
}
