'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle2, XCircle, Calendar, Copy, Pencil,
  ChevronLeft, ChevronRight, CheckCheck, Heart,
  MessageCircle, Send, MoreHorizontal, Bookmark,
  ThumbsUp, X, Clock,
} from 'lucide-react'
import type { Post, SocialPlatform, PostPrioridade } from '@/types'
import { useBrandStore } from '@/store/brandStore'
import {
  usePosts, useApprovePost, useRejectPost,
  useSchedulePost, useDuplicatePost, useUpdatePost,
} from '@/hooks/usePosts'
import { cn } from '@/lib/utils/cn'

// ── constants ──────────────────────────────────────────────────────────────────

const PLATFORM_LABEL: Record<SocialPlatform, string> = {
  instagram: 'Instagram', linkedin: 'LinkedIn', twitter: 'Twitter',
  facebook: 'Facebook', tiktok: 'TikTok',
}

const PLATFORM_COLOR: Record<SocialPlatform, string> = {
  instagram: 'text-violet-400', linkedin: 'text-blue-400',
  twitter: 'text-sky-400', facebook: 'text-blue-500', tiktok: 'text-pink-400',
}

const PLATFORM_GRADIENT: Record<SocialPlatform, string> = {
  instagram: 'from-violet-900/60 to-pink-900/40',
  linkedin:  'from-blue-900/60 to-slate-900/40',
  twitter:   'from-sky-900/60 to-slate-900/40',
  facebook:  'from-blue-900/60 to-indigo-900/40',
  tiktok:    'from-pink-900/60 to-violet-900/40',
}

const PLATFORM_BADGE: Record<SocialPlatform, string> = {
  instagram: 'bg-violet-600/20 text-violet-300 border-violet-500/30',
  linkedin:  'bg-blue-600/20 text-blue-300 border-blue-500/30',
  twitter:   'bg-sky-600/20 text-sky-300 border-sky-500/30',
  facebook:  'bg-blue-700/20 text-blue-400 border-blue-600/30',
  tiktok:    'bg-pink-600/20 text-pink-300 border-pink-500/30',
}

const FORMAT_LABEL: Record<string, string> = {
  carrossel: 'Carrossel', reels: 'Reels', imagem_unica: 'Imagem',
  stories: 'Stories', texto: 'Texto', video: 'Vídeo', live: 'Live',
}

const FORMAT_ICON: Record<string, string> = {
  reels: '▶', video: '▶', carrossel: '❐', stories: '↕',
  imagem_unica: '🖼', texto: '✦', live: '●',
}

const PRIORITY_LABEL: Record<PostPrioridade, string> = {
  baixa: 'Baixa', media: 'Média', alta: 'Alta', urgente: 'Urgente',
}

const PRIORITY_COLOR: Record<PostPrioridade, string> = {
  baixa: 'text-slate-500', media: 'text-amber-400',
  alta: 'text-orange-400', urgente: 'text-red-400',
}

const PRIORITY_DOT: Record<PostPrioridade, string> = {
  baixa: 'bg-slate-600', media: 'bg-amber-400',
  alta: 'bg-orange-400', urgente: 'bg-red-400',
}

// ── RejectModal ────────────────────────────────────────────────────────────────

interface RejectModalProps {
  onConfirm: (reason: string) => void
  onClose: () => void
}

function RejectModal({ onConfirm, onClose }: RejectModalProps) {
  const [reason, setReason] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-50 border border-slate-300 rounded-xl w-[480px] shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Rejeitar post</h3>
            <p className="text-xs text-slate-500 mt-0.5">O motivo será enviado ao editor responsável.</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md text-slate-600 hover:text-slate-400 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="Ex.: Caption muito longa, revisar hashtags, CTA pouco claro..."
            className="w-full bg-slate-100 border border-slate-300 rounded-md px-3 py-2.5 text-sm text-slate-700 placeholder-slate-600 resize-none focus:outline-none focus:border-indigo-500 transition-colors"
            autoFocus
          />
          <p className="text-[10px] text-slate-700 mt-1.5 text-right">{reason.length} caracteres</p>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-700 transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => { if (reason.trim()) onConfirm(reason.trim()) }}
            disabled={!reason.trim()}
            className="px-4 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
          >
            Confirmar rejeição
          </button>
        </div>
      </div>
    </div>
  )
}

// ── EditModal ──────────────────────────────────────────────────────────────────

interface EditModalProps {
  post: Post
  onConfirm: (caption: string, prioridade: PostPrioridade) => void
  onClose: () => void
}

function EditModal({ post, onConfirm, onClose }: EditModalProps) {
  const [caption, setCaption] = useState(post.caption)
  const [prioridade, setPrioridade] = useState<PostPrioridade>(post.prioridade)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-50 border border-slate-300 rounded-xl w-[560px] shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Editar post</h3>
            <p className="text-xs text-slate-500 mt-0.5">Salvar retorna o post à fila com as alterações.</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md text-slate-600 hover:text-slate-400 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Caption
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={6}
              className="w-full bg-slate-100 border border-slate-300 rounded-md px-3 py-2.5 text-sm text-slate-700 resize-none focus:outline-none focus:border-indigo-500 transition-colors leading-relaxed"
              autoFocus
            />
            <p className="text-[10px] text-slate-600 mt-1 text-right">{caption.length} caracteres</p>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Prioridade
            </label>
            <div className="flex items-center gap-2">
              {(['baixa', 'media', 'alta', 'urgente'] as PostPrioridade[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPrioridade(p)}
                  className={cn(
                    'flex-1 py-1.5 rounded-md text-xs font-medium border transition-colors',
                    prioridade === p
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-100 border-slate-300 text-slate-400 hover:text-slate-700 hover:border-slate-300'
                  )}
                >
                  {PRIORITY_LABEL[p]}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-700 transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => { if (caption.trim()) onConfirm(caption.trim(), prioridade) }}
            disabled={!caption.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
          >
            Salvar alterações
          </button>
        </div>
      </div>
    </div>
  )
}

// ── ScheduleModal ──────────────────────────────────────────────────────────────

interface ScheduleModalProps {
  onConfirm: (isoDate: string) => void
  onClose: () => void
}

function ScheduleModal({ onConfirm, onClose }: ScheduleModalProps) {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const defaultDate = tomorrow.toISOString().slice(0, 10)
  const pad = (n: number) => String(n).padStart(2, '0')
  const now = new Date()
  const defaultTime = `${pad(now.getHours())}:00`

  const [date, setDate] = useState(defaultDate)
  const [time, setTime] = useState(defaultTime)

  const scheduledLabel = date && time
    ? new Date(`${date}T${time}`).toLocaleString('pt-BR', {
        weekday: 'long', day: '2-digit', month: 'long',
        hour: '2-digit', minute: '2-digit',
      })
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-50 border border-slate-300 rounded-xl w-[420px] shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Agendar publicação</h3>
            <p className="text-xs text-slate-500 mt-0.5">O post será aprovado e agendado automaticamente.</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md text-slate-600 hover:text-slate-400 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Data
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-100 border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Horário
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-slate-100 border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>
          {scheduledLabel && (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-indigo-950/40 border border-indigo-500/20 rounded-lg">
              <Clock className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
              <p className="text-xs text-indigo-300 capitalize">{scheduledLabel}</p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-700 transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => { if (date && time) onConfirm(new Date(`${date}T${time}`).toISOString()) }}
            disabled={!date || !time}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
          >
            <Calendar className="w-3.5 h-3.5" />
            Confirmar agendamento
          </button>
        </div>
      </div>
    </div>
  )
}

// ── PostPreview ────────────────────────────────────────────────────────────────

function PostPreview({ post }: { post: Post }) {
  // Deterministic mock engagement based on post id
  const likes = 100 + (post.id * 37) % 900
  const comments = 10 + (post.id * 13) % 90

  return (
    <div className="w-full max-w-[400px] mx-auto select-none">
      <div className="bg-white border border-slate-300 rounded-2xl overflow-hidden shadow-2xl">
        {/* Platform header */}
        <div className={cn('px-4 py-3 flex items-center justify-between bg-gradient-to-r', PLATFORM_GRADIENT[post.platform])}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center ring-2 ring-white/10">
              <span className="text-[11px] font-bold text-white">M</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-white leading-tight">minha_marca</p>
              <p className="text-[10px] text-white/50 leading-tight">{PLATFORM_LABEL[post.platform]}</p>
            </div>
          </div>
          <MoreHorizontal className="w-4 h-4 text-white/30" />
        </div>

        {/* Media placeholder */}
        <div className={cn('h-52 bg-gradient-to-br relative flex items-center justify-center', PLATFORM_GRADIENT[post.platform])}>
          <div className="absolute inset-0 bg-black/5" />
          <div className="relative z-10 text-center space-y-1.5">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
              <span className="text-2xl">{FORMAT_ICON[post.formato] ?? '🖼'}</span>
            </div>
            <p className="text-[11px] text-white/30 font-medium">{FORMAT_LABEL[post.formato]}</p>
          </div>
        </div>

        {/* Content area */}
        <div className="px-4 py-3.5 space-y-3 bg-slate-50">
          {/* Engagement icons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              {post.platform === 'linkedin' ? (
                <button className="flex items-center gap-1.5 text-slate-500 hover:text-blue-400 transition-colors">
                  <ThumbsUp className="w-4 h-4" />
                  <span className="text-[10px]">Curtir</span>
                </button>
              ) : (
                <button className="text-slate-500 hover:text-red-400 transition-colors">
                  <Heart className="w-4 h-4" />
                </button>
              )}
              <button className="text-slate-500 hover:text-slate-700 transition-colors">
                <MessageCircle className="w-4 h-4" />
              </button>
              <button className="text-slate-500 hover:text-slate-700 transition-colors">
                <Send className="w-4 h-4" />
              </button>
            </div>
            <button className="text-slate-500 hover:text-slate-700 transition-colors">
              <Bookmark className="w-4 h-4" />
            </button>
          </div>

          {/* Mock likes */}
          <p className="text-[11px] font-semibold text-slate-400">{likes.toLocaleString('pt-BR')} curtidas</p>

          {/* Caption */}
          <div className="text-xs text-slate-700 leading-relaxed">
            <span className="font-semibold text-slate-900">minha_marca</span>{' '}
            <span className="whitespace-pre-line line-clamp-6">{post.caption}</span>
          </div>

          {/* Hashtags */}
          {post.hashtags && (
            <p className="text-xs text-indigo-400 leading-relaxed line-clamp-2">
              {post.hashtags}
            </p>
          )}

          {/* CTA */}
          {post.cta && (
            <div className="px-3 py-2 bg-indigo-600/10 border border-indigo-500/20 rounded-lg">
              <p className="text-[11px] text-indigo-300 italic">{post.cta}</p>
            </div>
          )}

          {/* Comments count */}
          <button className="text-[11px] text-slate-600 hover:text-slate-500 transition-colors">
            Ver todos os {comments} comentários
          </button>
        </div>
      </div>

      {/* Preview label */}
      <p className="text-center text-[10px] text-slate-700 mt-3">
        Visualização de como o post será exibido
      </p>
    </div>
  )
}

// ── ApprovalPage ───────────────────────────────────────────────────────────────

type ModalType = 'reject' | 'edit' | 'schedule' | null

export default function ApprovalPage() {
  const activeBrand = useBrandStore((s) => s.activeBrand)
  const brandId = activeBrand?.id ?? 0

  const { data: posts = [] } = usePosts(brandId)
  const approvePost   = useApprovePost()
  const rejectPost    = useRejectPost()
  const schedulePost  = useSchedulePost()
  const duplicatePost = useDuplicatePost()

  const queue = posts.filter((p) => p.status === 'rascunho')

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [modal, setModal] = useState<ModalType>(null)

  // updatePost must be called at top-level (hook rules)
  const updatePost = useUpdatePost(selectedId ?? 0)

  // Auto-select first item
  useEffect(() => {
    if (selectedId === null && queue.length > 0) setSelectedId(queue[0].id)
  }, [queue.length])

  const selectedPost  = queue.find((p) => p.id === selectedId) ?? null
  const selectedIndex = queue.findIndex((p) => p.id === selectedId)

  function navigate(dir: 'prev' | 'next') {
    const newIdx = dir === 'next'
      ? Math.min(selectedIndex + 1, queue.length - 1)
      : Math.max(selectedIndex - 1, 0)
    setSelectedId(queue[newIdx]?.id ?? null)
  }

  function advanceQueue(excludeId: number) {
    const remaining = queue.filter((p) => p.id !== excludeId)
    const nextIdx = Math.min(selectedIndex, remaining.length - 1)
    setSelectedId(remaining[nextIdx]?.id ?? null)
  }

  const handleApprove = useCallback(() => {
    if (!selectedId) return
    approvePost.mutate(selectedId)
    advanceQueue(selectedId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selectedIndex, queue])

  const handleRejectConfirm = useCallback((reason: string) => {
    if (!selectedId) return
    rejectPost.mutate({ id: selectedId, payload: { reason } })
    advanceQueue(selectedId)
    setModal(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selectedIndex, queue])

  const handleScheduleConfirm = useCallback((isoDate: string) => {
    if (!selectedId) return
    schedulePost.mutate({ id: selectedId, payload: { scheduled_at: isoDate } })
    advanceQueue(selectedId)
    setModal(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selectedIndex, queue])

  const handleEditConfirm = useCallback((caption: string, prioridade: PostPrioridade) => {
    if (!selectedId) return
    updatePost.mutate({ caption, prioridade })
    setModal(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  const handleDuplicate = useCallback(() => {
    if (!selectedId) return
    duplicatePost.mutate(selectedId)
  }, [selectedId])

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (modal) {
        if (e.key === 'Escape') setModal(null)
        return
      }
      if (e.key === 'a' || e.key === 'A') handleApprove()
      if (e.key === 'r' || e.key === 'R') setModal('reject')
      if (e.key === 'e' || e.key === 'E') setModal('edit')
      if (e.key === 's' || e.key === 'S') setModal('schedule')
      if (e.key === 'ArrowRight') navigate('next')
      if (e.key === 'ArrowLeft')  navigate('prev')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleApprove, selectedIndex, queue, modal])

  const allDone = queue.length === 0

  return (
    <>
      {/* Modals */}
      {modal === 'reject' && (
        <RejectModal onConfirm={handleRejectConfirm} onClose={() => setModal(null)} />
      )}
      {modal === 'edit' && selectedPost && (
        <EditModal post={selectedPost} onConfirm={handleEditConfirm} onClose={() => setModal(null)} />
      )}
      {modal === 'schedule' && (
        <ScheduleModal onConfirm={handleScheduleConfirm} onClose={() => setModal(null)} />
      )}

      <div className="flex h-full">

        {/* ── Left: Queue list ───────────────────────────────────────────────── */}
        <div className="w-[296px] border-r border-slate-200 flex flex-col flex-shrink-0">
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-slate-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h1 className="text-sm font-semibold text-slate-900">Fila de Aprovação</h1>
              {queue.length > 0 && (
                <span className="text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded-full">
                  {queue.length}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              {queue.length > 0
                ? `${queue.length} post${queue.length > 1 ? 's' : ''} aguardando revisão`
                : 'Nenhum post pendente'}
            </p>
          </div>

          {/* Keyboard hints */}
          <div className="px-4 py-2 border-b border-slate-200 bg-white/60 flex-shrink-0">
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {[
                { key: 'A', label: 'Aprovar' },
                { key: 'R', label: 'Rejeitar' },
                { key: 'E', label: 'Editar' },
                { key: 'S', label: 'Agendar' },
                { key: '← →', label: 'Navegar' },
              ].map(({ key, label }) => (
                <span key={key} className="flex items-center gap-1 text-[10px] text-slate-700">
                  <kbd className="bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded font-mono text-[9px] text-slate-500 leading-tight">
                    {key}
                  </kbd>
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Queue items */}
          <div className="flex-1 overflow-y-auto">
            {allDone ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCheck className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-600">Tudo aprovado!</p>
                  <p className="text-xs text-slate-600 mt-0.5">Nenhum post aguardando revisão.</p>
                </div>
              </div>
            ) : (
              queue.map((post) => {
                const isSelected = selectedId === post.id
                return (
                  <button
                    key={post.id}
                    onClick={() => setSelectedId(post.id)}
                    className={cn(
                      'w-full text-left px-4 py-3 border-b border-slate-200 transition-all relative',
                      isSelected ? 'bg-indigo-600/10' : 'hover:bg-slate-100'
                    )}
                  >
                    {isSelected && (
                      <span className="absolute left-0 top-3 bottom-3 w-0.5 bg-indigo-500 rounded-r" />
                    )}
                    <div className="flex items-start gap-2.5">
                      <span className={cn('w-1.5 h-1.5 rounded-full mt-[5px] flex-shrink-0', PRIORITY_DOT[post.prioridade])} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-slate-700 line-clamp-2 leading-snug mb-1.5">
                          {post.caption}
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={cn('text-[10px] font-semibold', PLATFORM_COLOR[post.platform])}>
                            {PLATFORM_LABEL[post.platform]}
                          </span>
                          <span className="text-[10px] text-slate-700">·</span>
                          <span className="text-[10px] text-slate-600">{FORMAT_LABEL[post.formato]}</span>
                          <span className="text-[10px] text-slate-700">·</span>
                          <span className={cn('text-[10px]', PRIORITY_COLOR[post.prioridade])}>
                            {PRIORITY_LABEL[post.prioridade]}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* ── Center: Social preview ────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200">
          {selectedPost ? (
            <>
              {/* Preview header bar */}
              <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-full border', PLATFORM_BADGE[selectedPost.platform])}>
                    {PLATFORM_LABEL[selectedPost.platform]}
                  </span>
                  <span className="text-xs text-slate-600">{FORMAT_LABEL[selectedPost.formato]}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => navigate('prev')}
                    disabled={selectedIndex <= 0}
                    className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-slate-600 tabular-nums min-w-[40px] text-center">
                    {selectedIndex + 1} / {queue.length}
                  </span>
                  <button
                    onClick={() => navigate('next')}
                    disabled={selectedIndex >= queue.length - 1}
                    className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Preview scroll area */}
              <div className="flex-1 overflow-y-auto p-8 flex items-start justify-center">
                <PostPreview post={selectedPost} />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCheck className="w-8 h-8 text-emerald-500" />
                </div>
                <p className="text-sm font-semibold text-slate-600">
                  {allDone ? 'Tudo em dia!' : 'Selecione um post para revisar'}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  {allDone
                    ? 'Não há posts aguardando aprovação.'
                    : 'Escolha um item da fila ao lado.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Actions + metadata ─────────────────────────────────────── */}
        <div className="w-[256px] flex flex-col flex-shrink-0">
          {selectedPost ? (
            <>
              <div className="px-4 py-3.5 border-b border-slate-200 flex-shrink-0">
                <h2 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Ações do revisor</h2>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                {/* Primary: Approve */}
                <button
                  onClick={handleApprove}
                  disabled={approvePost.isPending}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-emerald-700/80 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left">Aprovar</span>
                  <kbd className="text-[10px] text-emerald-200 bg-emerald-900/60 px-1.5 py-0.5 rounded font-mono">A</kbd>
                </button>

                {/* Danger: Reject */}
                <button
                  onClick={() => setModal('reject')}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-red-950/40 hover:bg-red-950/70 border border-red-900/30 hover:border-red-800/50 text-red-400 text-sm font-medium rounded-lg transition-colors"
                >
                  <XCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left">Rejeitar</span>
                  <kbd className="text-[10px] text-red-700 bg-red-950/60 px-1.5 py-0.5 rounded font-mono">R</kbd>
                </button>

                {/* Divider */}
                <div className="py-1">
                  <div className="border-t border-slate-200" />
                </div>

                {/* Schedule */}
                <button
                  onClick={() => setModal('schedule')}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 hover:border-slate-300 text-slate-600 text-sm font-medium rounded-lg transition-colors"
                >
                  <Calendar className="w-4 h-4 flex-shrink-0 text-indigo-400" />
                  <span className="flex-1 text-left">Agendar</span>
                  <kbd className="text-[10px] text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded font-mono">S</kbd>
                </button>

                {/* Edit */}
                <button
                  onClick={() => setModal('edit')}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 hover:border-slate-300 text-slate-600 text-sm font-medium rounded-lg transition-colors"
                >
                  <Pencil className="w-4 h-4 flex-shrink-0 text-amber-400" />
                  <span className="flex-1 text-left">Editar</span>
                  <kbd className="text-[10px] text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded font-mono">E</kbd>
                </button>

                {/* Duplicate */}
                <button
                  onClick={handleDuplicate}
                  disabled={duplicatePost.isPending}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 hover:border-slate-300 text-slate-600 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  <Copy className="w-4 h-4 flex-shrink-0 text-slate-500" />
                  <span className="flex-1 text-left">Duplicar</span>
                </button>

                {/* Post metadata card */}
                <div className="pt-2">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                    <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Detalhes</p>
                    <div className="space-y-2.5">
                      {[
                        {
                          label: 'Plataforma',
                          value: PLATFORM_LABEL[selectedPost.platform],
                          className: PLATFORM_COLOR[selectedPost.platform],
                        },
                        {
                          label: 'Formato',
                          value: FORMAT_LABEL[selectedPost.formato],
                          className: 'text-slate-600',
                        },
                        {
                          label: 'Prioridade',
                          value: PRIORITY_LABEL[selectedPost.prioridade],
                          className: PRIORITY_COLOR[selectedPost.prioridade],
                        },
                        {
                          label: 'Criado em',
                          value: new Date(selectedPost.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          }),
                          className: 'text-slate-400',
                        },
                      ].map(({ label, value, className }) => (
                        <div key={label} className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-600">{label}</span>
                          <span className={cn('text-[11px] font-medium text-right', className)}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6">
              <p className="text-xs text-slate-700 text-center leading-relaxed">
                Selecione um post da fila para ver as ações disponíveis.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
