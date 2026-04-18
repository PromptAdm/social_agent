'use client'

import { useCallback, useRef, useState } from 'react'
import {
  ImagePlus, X, Zap, Sparkles, Megaphone,
  Upload, AlertCircle, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { imageTreeService } from '@/services/imageTreeService'
import { useCredits } from '@/hooks/useCredits'
import { toast } from '@/store/uiStore'

// ── Opções de direção criativa ─────────────────────────────────────────────

const OBJECTIVES = [
  { value: 'social_media', label: 'Redes Sociais' },
  { value: 'advertising',  label: 'Publicidade' },
  { value: 'branding',     label: 'Branding' },
  { value: 'content',      label: 'Conteúdo' },
  { value: 'product',      label: 'Produto' },
]

const STYLES = [
  { value: 'bold',       label: 'Bold' },
  { value: 'minimalist', label: 'Minimalista' },
  { value: 'lifestyle',  label: 'Lifestyle' },
  { value: 'corporate',  label: 'Corporativo' },
  { value: 'artistic',   label: 'Artístico' },
  { value: 'playful',    label: 'Playful' },
]

const TONES = [
  { value: 'professional', label: 'Profissional' },
  { value: 'creative',     label: 'Criativo' },
  { value: 'casual',       label: 'Casual' },
  { value: 'elegant',      label: 'Elegante' },
  { value: 'vibrant',      label: 'Vibrante' },
  { value: 'dark',         label: 'Dark' },
]

const MODES = [
  {
    value:   'fast',
    label:   'Rápido',
    desc:    '1 família · 4 variações',
    credits: 10,
    icon:    Zap,
    active:  'border-indigo-500/40 bg-indigo-600/10 shadow-lg shadow-indigo-500/8',
    icon_c:  'bg-indigo-600/20 text-indigo-400',
    text_c:  'text-indigo-300',
    cred_c:  'text-indigo-400',
  },
  {
    value:   'creative',
    label:   'Criativo',
    desc:    '2 famílias · 4 variações cada',
    credits: 20,
    icon:    Sparkles,
    active:  'border-violet-500/40 bg-violet-600/10 shadow-lg shadow-violet-500/8',
    icon_c:  'bg-violet-600/20 text-violet-400',
    text_c:  'text-violet-300',
    cred_c:  'text-violet-400',
  },
  {
    value:   'campaign',
    label:   'Campanha',
    desc:    '3 famílias · 4 variações cada',
    credits: 30,
    icon:    Megaphone,
    active:  'border-pink-500/40 bg-pink-600/10 shadow-lg shadow-pink-500/8',
    icon_c:  'bg-pink-600/20 text-pink-400',
    text_c:  'text-pink-300',
    cred_c:  'text-pink-400',
  },
]

interface StudioFormProps {
  onProjectCreated: (projectId: number) => void
}

export function StudioForm({ onProjectCreated }: StudioFormProps) {
  const [description, setDescription] = useState('')
  const [objective,   setObjective]   = useState('social_media')
  const [style,       setStyle]       = useState('bold')
  const [tone,        setTone]        = useState('professional')
  const [mode,        setMode]        = useState('fast')
  const [references,  setReferences]  = useState<File[]>([])
  const [isDragging,  setIsDragging]  = useState(false)
  const [isLoading,   setIsLoading]   = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: credits } = useCredits()
  const selectedMode = MODES.find((m) => m.value === mode)!
  const canAfford = !credits || credits.balance >= selectedMode.credits

  const addFiles = useCallback((files: FileList | File[]) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    const valid: File[] = []
    Array.from(files).forEach((f) => {
      if (!allowed.includes(f.type)) {
        setError(`Formato não suportado: ${f.name}. Use JPG, PNG, WebP ou GIF.`)
        return
      }
      if (f.size > 10 * 1024 * 1024) {
        setError(`${f.name} excede 10 MB.`)
        return
      }
      valid.push(f)
    })
    if (valid.length) {
      setError(null)
      setReferences((prev) => [...prev, ...valid].slice(0, 5))
    }
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    addFiles(e.dataTransfer.files)
  }, [addFiles])

  const removeRef = (idx: number) => {
    setReferences((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async () => {
    if (!description.trim()) {
      setError('Adicione uma descrição para guiar a geração.')
      return
    }
    setError(null)
    setIsLoading(true)
    try {
      const result = await imageTreeService.create({
        description: description.trim(),
        objective,
        style,
        tone,
        mode,
        references: references.length ? references : undefined,
      })
      onProjectCreated(result.project_id)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })
          ?.response?.data?.detail ?? 'Erro ao criar projeto.'
      setError(msg)
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600/25 to-violet-600/10 border border-indigo-500/25 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/10">
          <Sparkles className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-[20px] font-semibold text-slate-100 tracking-tight">Árvore de Imagens</h1>
          <p className="text-[13px] text-slate-500 mt-0.5 leading-relaxed">
            Descreva sua direção criativa e receba famílias visuais distintas para sua marca.
          </p>
        </div>
      </div>

      {/* Credits info */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl border text-[13px]',
        canAfford
          ? 'bg-[#0C0C11] border-[#1E1E2A] text-slate-500'
          : 'bg-red-500/5 border-red-500/20 text-red-400',
      )}>
        <Zap className={cn('w-4 h-4 flex-shrink-0', canAfford ? 'text-indigo-400' : 'text-red-400')} />
        <span>
          Modo selecionado: <strong className="text-slate-300">{selectedMode.credits} créditos</strong>.
          {credits && (
            <> Saldo disponível: <strong className={canAfford ? 'text-slate-300' : 'text-red-300'}>{credits.balance}</strong>.</>
          )}
        </span>
      </div>

      {/* References upload */}
      <div className="space-y-3">
        <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-600">
          Imagens de referência
          <span className="ml-1.5 normal-case font-normal text-slate-700">opcional · até 5</span>
        </label>

        {references.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {references.map((f, idx) => (
              <div
                key={idx}
                className="relative w-16 h-16 rounded-xl overflow-hidden border border-[#27273A] bg-[#0F0F17] flex-shrink-0 group"
              >
                <img
                  src={URL.createObjectURL(f)}
                  alt={f.name}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => removeRef(idx)}
                  className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ))}
            {references.length < 5 && (
              <button
                onClick={() => inputRef.current?.click()}
                className="w-16 h-16 rounded-xl border border-dashed border-[#27273A] hover:border-indigo-500/30 hover:bg-indigo-600/5 flex items-center justify-center text-slate-700 hover:text-indigo-400 transition-all"
              >
                <ImagePlus className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {references.length === 0 && (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200',
              isDragging
                ? 'border-indigo-500/50 bg-indigo-600/6'
                : 'border-[#1E1E2A] hover:border-[#2E2E3E] hover:bg-[#0F0F17]',
            )}
          >
            <div className="w-11 h-11 bg-[#17171F] border border-[#27273A] rounded-2xl flex items-center justify-center">
              <Upload className="w-4.5 h-4.5 text-slate-600" />
            </div>
            <div className="text-center">
              <p className="text-[13px] font-medium text-slate-400">Arraste imagens de referência</p>
              <p className="text-[12px] text-slate-700 mt-0.5">JPG, PNG, WebP · até 5 arquivos · 10 MB cada</p>
            </div>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-600">
          Descrição criativa <span className="text-red-400 ml-0.5">*</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descreva a marca, o produto ou campanha. Quanto mais contexto, melhor o resultado..."
          rows={3}
          className="w-full bg-[#0B0B12] border border-[#1E1E2A] focus:border-indigo-500/40 focus:bg-[#0D0D16] rounded-xl px-4 py-3 text-[14px] text-slate-200 placeholder:text-slate-700 outline-none resize-none transition-all leading-relaxed"
        />
      </div>

      {/* Creative direction */}
      <div className="grid grid-cols-2 gap-5">
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-600">Objetivo</label>
          <div className="space-y-1">
            {OBJECTIVES.map((o) => (
              <button
                key={o.value}
                onClick={() => setObjective(o.value)}
                className={cn(
                  'w-full px-3 py-2 rounded-lg border text-[13px] font-medium text-left transition-all',
                  objective === o.value
                    ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-300'
                    : 'bg-[#0B0B12] border-[#1A1A24] text-slate-500 hover:border-[#27273A] hover:text-slate-300',
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-600">Estilo Visual</label>
          <div className="space-y-1">
            {STYLES.map((s) => (
              <button
                key={s.value}
                onClick={() => setStyle(s.value)}
                className={cn(
                  'w-full px-3 py-2 rounded-lg border text-[13px] font-medium text-left transition-all',
                  style === s.value
                    ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-300'
                    : 'bg-[#0B0B12] border-[#1A1A24] text-slate-500 hover:border-[#27273A] hover:text-slate-300',
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tom */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-600">Tom</label>
        <div className="grid grid-cols-3 gap-2">
          {TONES.map((t) => (
            <button
              key={t.value}
              onClick={() => setTone(t.value)}
              className={cn(
                'px-3 py-2 rounded-xl border text-[13px] font-medium transition-all',
                tone === t.value
                  ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-300'
                  : 'bg-[#0B0B12] border-[#1A1A24] text-slate-500 hover:border-[#27273A] hover:text-slate-300',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Generation mode */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-600">Modo de Geração</label>
        <div className="grid grid-cols-3 gap-3">
          {MODES.map((m) => {
            const Icon = m.icon
            const isSelected = mode === m.value
            return (
              <button
                key={m.value}
                onClick={() => setMode(m.value)}
                className={cn(
                  'relative flex flex-col items-center gap-2.5 px-3 py-5 rounded-2xl border text-center transition-all duration-200',
                  isSelected
                    ? m.active
                    : 'bg-[#0B0B12] border-[#1A1A24] hover:border-[#27273A] hover:bg-[#0F0F17]',
                )}
              >
                {isSelected && (
                  <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-current opacity-60"
                    style={{ color: 'inherit' }}
                  />
                )}
                <div className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center transition-colors',
                  isSelected ? m.icon_c : 'bg-[#17171F] text-slate-600',
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <p className={cn(
                    'text-[13px] font-semibold leading-tight',
                    isSelected ? m.text_c : 'text-slate-400',
                  )}>
                    {m.label}
                  </p>
                  <p className="text-[10px] text-slate-600 leading-tight">{m.desc}</p>
                  <p className={cn(
                    'text-[12px] font-bold mt-1 leading-none',
                    isSelected ? m.cred_c : 'text-slate-700',
                  )}>
                    {m.credits} créditos
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-red-500/6 border border-red-500/20 rounded-xl text-[13px] text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* CTA */}
      <button
        onClick={handleSubmit}
        disabled={isLoading || !canAfford || !description.trim()}
        className={cn(
          'w-full h-12 rounded-xl text-[14px] font-semibold transition-all duration-200 flex items-center justify-center gap-2',
          !isLoading && canAfford && description.trim()
            ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-lg shadow-indigo-600/25 hover:-translate-y-[1px] hover:shadow-indigo-600/35'
            : 'bg-[#111118] text-slate-600 cursor-not-allowed border border-[#1E1E2A]',
        )}
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Criando projeto...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Gerar Famílias Visuais — {selectedMode.credits} créditos
            <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
          </>
        )}
      </button>
    </div>
  )
}
