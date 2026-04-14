'use client'

import { useState, useEffect } from 'react'
import { X, FileText, Sparkles, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useBrandStore } from '@/store/brandStore'
import { useCreatePost, useUpdatePost } from '@/hooks/usePosts'
import { usePillars } from '@/hooks/useBrands'
import type { Post, SocialPlatform, PostFormato, PostPrioridade } from '@/types'
import type { CreatePostPayload, UpdatePostPayload } from '@/services/postService'

// ── Options ────────────────────────────────────────────────────────────────────

const PLATFORM_OPTIONS: { value: SocialPlatform; label: string; color: string }[] = [
  { value: 'instagram', label: 'Instagram', color: 'text-violet-400' },
  { value: 'linkedin',  label: 'LinkedIn',  color: 'text-blue-400'   },
  { value: 'twitter',   label: 'Twitter/X', color: 'text-sky-400'    },
  { value: 'tiktok',    label: 'TikTok',    color: 'text-pink-400'   },
  { value: 'facebook',  label: 'Facebook',  color: 'text-blue-500'   },
]

const FORMAT_OPTIONS: { value: PostFormato; label: string }[] = [
  { value: 'imagem_unica', label: 'Imagem única' },
  { value: 'carrossel',    label: 'Carrossel'    },
  { value: 'reels',        label: 'Reels'        },
  { value: 'stories',      label: 'Stories'      },
  { value: 'video',        label: 'Vídeo'        },
  { value: 'texto',        label: 'Texto'        },
  { value: 'live',         label: 'Live'         },
]

const PRIORITY_OPTIONS: { value: PostPrioridade; label: string; color: string }[] = [
  { value: 'baixa',   label: 'Baixa',   color: 'text-slate-400'  },
  { value: 'media',   label: 'Média',   color: 'text-amber-400'  },
  { value: 'alta',    label: 'Alta',    color: 'text-orange-400' },
  { value: 'urgente', label: 'Urgente', color: 'text-red-400'    },
]

// ── FieldSection helper ────────────────────────────────────────────────────────

function FieldSection({ label, required, children }: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block field-label mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5 normal-case text-xs">*</span>}
      </label>
      {children}
    </div>
  )
}

// ── RadioGroup helper ──────────────────────────────────────────────────────────

function RadioGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; color?: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all',
            value === opt.value
              ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
              : 'bg-transparent border-[#27273A] text-slate-500 hover:text-slate-300 hover:border-[#3F3F56]',
          )}
        >
          <span className={value === opt.value ? '' : (opt.color ?? '')}>
            {opt.label}
          </span>
        </button>
      ))}
    </div>
  )
}

// ── PostFormModal ──────────────────────────────────────────────────────────────

interface PostFormModalProps {
  initial?: Post          // Se fornecido, modo edição
  onClose: () => void
}

export function PostFormModal({ initial, onClose }: PostFormModalProps) {
  const isEdit   = !!initial
  const brandId  = useBrandStore((s) => s.activeBrand?.id) ?? initial?.brand_id ?? 0

  // Form state
  const [caption,    setCaption]    = useState(initial?.caption    ?? '')
  const [hashtags,   setHashtags]   = useState(initial?.hashtags   ?? '')
  const [cta,        setCta]        = useState(initial?.cta        ?? '')
  const [platform,   setPlatform]   = useState<SocialPlatform>(initial?.platform   ?? 'instagram')
  const [formato,    setFormato]    = useState<PostFormato>(initial?.formato    ?? 'imagem_unica')
  const [prioridade, setPrioridade] = useState<PostPrioridade>(initial?.prioridade ?? 'media')
  const [pillarId,   setPillarId]   = useState<number | undefined>(initial?.pillar_id ?? undefined)
  const [captionLen, setCaptionLen] = useState(initial?.caption?.length ?? 0)

  const createPost  = useCreatePost()
  const updatePost  = useUpdatePost(initial?.id ?? 0)
  const { data: pillars = [] } = usePillars(brandId)

  const isPending = createPost.isPending || updatePost.isPending

  function handleCaptionChange(v: string) {
    setCaption(v)
    setCaptionLen(v.length)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!caption.trim() || !brandId) return

    if (isEdit) {
      const payload: UpdatePostPayload = {
        caption:    caption.trim(),
        hashtags:   hashtags.trim() || undefined,
        cta:        cta.trim()      || undefined,
        platform,
        formato,
        prioridade,
        pillar_id:  pillarId ?? null,
      }
      updatePost.mutate(payload, { onSuccess: onClose })
    } else {
      const payload: CreatePostPayload = {
        brand_id:   brandId,
        caption:    caption.trim(),
        hashtags:   hashtags.trim() || undefined,
        cta:        cta.trim()      || undefined,
        platform,
        formato,
        prioridade,
        pillar_id:  pillarId,
      }
      createPost.mutate(payload, { onSuccess: onClose })
    }
  }

  // Caption limit warning
  const captionWarning = captionLen > 2000

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        className="bg-[#111118] border border-[#27273A] rounded-xl w-full max-w-[640px] shadow-modal animate-fade-up max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E1E2A] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/15 border border-indigo-500/20 flex items-center justify-center">
              <FileText className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                {isEdit ? 'Editar post' : 'Novo post'}
              </h2>
              <p className="text-[11px] text-slate-500">
                {isEdit ? 'Atualize o conteúdo do rascunho.' : 'Crie um rascunho para revisão e aprovação.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-600 hover:text-slate-300 hover:bg-[#17171F] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form id="post-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-5">

            {/* Caption */}
            <FieldSection label="Caption" required>
              <div className="relative">
                <textarea
                  value={caption}
                  onChange={(e) => handleCaptionChange(e.target.value)}
                  rows={5}
                  placeholder="Escreva o caption do post. Seja direto e engajador…"
                  className={cn(
                    'input h-auto py-3 resize-none leading-relaxed',
                    captionWarning && 'border-amber-500/60 focus:border-amber-500/80',
                  )}
                  autoFocus
                  required
                />
                <div className={cn(
                  'absolute bottom-2 right-2.5 text-[10px] tabular-nums',
                  captionWarning ? 'text-amber-400' : 'text-slate-700',
                )}>
                  {captionLen}
                </div>
              </div>
              {captionWarning && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3 text-amber-400 flex-shrink-0" />
                  <p className="text-[11px] text-amber-400">
                    Caption muito longo para a maioria das plataformas.
                  </p>
                </div>
              )}
            </FieldSection>

            {/* Platform */}
            <FieldSection label="Plataforma" required>
              <RadioGroup
                options={PLATFORM_OPTIONS}
                value={platform}
                onChange={setPlatform}
              />
            </FieldSection>

            {/* Formato */}
            <FieldSection label="Formato">
              <RadioGroup
                options={FORMAT_OPTIONS}
                value={formato}
                onChange={setFormato}
              />
            </FieldSection>

            {/* Prioridade */}
            <FieldSection label="Prioridade">
              <RadioGroup
                options={PRIORITY_OPTIONS}
                value={prioridade}
                onChange={setPrioridade}
              />
            </FieldSection>

            {/* Hashtags */}
            <FieldSection label="Hashtags">
              <input
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                placeholder="#marketing #conteudo #socialmedia"
                className="input font-mono text-indigo-300 placeholder:font-sans placeholder:text-slate-600"
              />
              <p className="text-[11px] text-slate-600 mt-1">
                Separe com espaço. Serão adicionadas abaixo do caption.
              </p>
            </FieldSection>

            {/* CTA */}
            <FieldSection label="Call to Action (CTA)">
              <input
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                placeholder="Ex.: Clique no link da bio para saber mais."
                className="input"
              />
            </FieldSection>

            {/* Pilar */}
            {pillars.length > 0 && (
              <FieldSection label="Pilar de conteúdo">
                <select
                  value={pillarId ?? ''}
                  onChange={(e) => setPillarId(e.target.value ? Number(e.target.value) : undefined)}
                  className="input bg-[#0C0C11] cursor-pointer"
                >
                  <option value="">Nenhum</option>
                  {pillars.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </FieldSection>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#1E1E2A] flex-shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
            <Sparkles className="w-3 h-3" />
            <span>Rascunho — aguarda aprovação</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancelar
            </button>
            <button
              type="submit"
              form="post-form"
              disabled={isPending || !caption.trim() || !brandId}
              className="btn-primary min-w-[130px]"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Salvando…
                </span>
              ) : isEdit ? 'Salvar alterações' : 'Criar rascunho'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
