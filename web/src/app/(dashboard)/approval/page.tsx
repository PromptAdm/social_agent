'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, XCircle, ChevronLeft, ChevronRight, CheckCheck } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { mockPosts } from '@/lib/mock/data'
import type { Post, SocialPlatform } from '@/types'

const PLATFORM_LABEL: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  twitter: 'Twitter',
  facebook: 'Facebook',
  tiktok: 'TikTok',
}

const PLATFORM_COLOR: Record<SocialPlatform, string> = {
  instagram: 'text-violet-400',
  linkedin: 'text-blue-400',
  twitter: 'text-sky-400',
  facebook: 'text-blue-500',
  tiktok: 'text-pink-400',
}

const FORMAT_LABEL: Record<string, string> = {
  carrossel: 'Carrossel',
  reels: 'Reels',
  imagem_unica: 'Imagem',
  stories: 'Stories',
  texto: 'Texto',
  video: 'Vídeo',
  live: 'Live',
}

const initialQueue = mockPosts.filter((p) => p.status === 'rascunho')

export default function ApprovalPage() {
  const [decisions, setDecisions] = useState<Record<number, 'approved' | 'rejected'>>({})
  const [selectedId, setSelectedId] = useState<number | null>(initialQueue[0]?.id ?? null)

  const queue = initialQueue.filter((p) => !decisions[p.id])
  const selectedPost = initialQueue.find((p) => p.id === selectedId) ?? null
  const selectedIndex = queue.findIndex((p) => p.id === selectedId)

  function navigate(dir: 'prev' | 'next') {
    const newIdx =
      dir === 'next'
        ? Math.min(selectedIndex + 1, queue.length - 1)
        : Math.max(selectedIndex - 1, 0)
    setSelectedId(queue[newIdx]?.id ?? null)
  }

  const handleApprove = useCallback(() => {
    if (!selectedId) return
    setDecisions((prev) => ({ ...prev, [selectedId]: 'approved' }))
    const nextIdx = queue.findIndex((p) => p.id === selectedId) + 1
    const next = queue.filter((p) => p.id !== selectedId)[nextIdx - 1]
    setSelectedId(next?.id ?? queue.find((p) => p.id !== selectedId)?.id ?? null)
  }, [selectedId, queue])

  const handleReject = useCallback(() => {
    if (!selectedId) return
    setDecisions((prev) => ({ ...prev, [selectedId]: 'rejected' }))
    const nextIdx = queue.findIndex((p) => p.id === selectedId) + 1
    const next = queue.filter((p) => p.id !== selectedId)[nextIdx - 1]
    setSelectedId(next?.id ?? queue.find((p) => p.id !== selectedId)?.id ?? null)
  }, [selectedId, queue])

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'a' || e.key === 'A') handleApprove()
      if (e.key === 'r' || e.key === 'R') handleReject()
      if (e.key === 'ArrowRight') navigate('next')
      if (e.key === 'ArrowLeft') navigate('prev')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleApprove, handleReject, selectedIndex, queue])

  const allDone = queue.length === 0

  return (
    <div className="flex h-full">
      {/* Left: queue */}
      <div className="w-[340px] border-r border-[#1E1E2A] flex flex-col flex-shrink-0">
        <div className="px-5 py-4 border-b border-[#1E1E2A]">
          <h1 className="text-base font-semibold text-slate-100">Fila de Aprovação</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {queue.length > 0
              ? `${queue.length} post${queue.length > 1 ? 's' : ''} aguardando revisão`
              : 'Nenhum post pendente'}
          </p>
        </div>

        {/* Keyboard hint */}
        <div className="px-5 py-2.5 border-b border-[#1E1E2A] bg-[#111118]/50">
          <div className="flex items-center gap-3 text-[10px] text-slate-600">
            <span>
              <kbd className="bg-[#17171F] border border-[#27273A] px-1.5 py-0.5 rounded text-[10px]">
                A
              </kbd>{' '}
              Aprovar
            </span>
            <span>
              <kbd className="bg-[#17171F] border border-[#27273A] px-1.5 py-0.5 rounded text-[10px]">
                R
              </kbd>{' '}
              Rejeitar
            </span>
            <span>
              <kbd className="bg-[#17171F] border border-[#27273A] px-1.5 py-0.5 rounded text-[10px]">
                ← →
              </kbd>{' '}
              Navegar
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {allDone ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
              <CheckCheck className="w-10 h-10 text-emerald-500" />
              <p className="text-sm font-medium text-slate-300">Tudo aprovado!</p>
              <p className="text-xs text-slate-600">
                Todos os posts foram revisados.
              </p>
            </div>
          ) : (
            initialQueue.map((post) => {
              const decision = decisions[post.id]
              const isSelected = selectedId === post.id
              const isPending = !decision

              return (
                <button
                  key={post.id}
                  onClick={() => isPending && setSelectedId(post.id)}
                  disabled={!isPending}
                  className={`w-full text-left px-4 py-3.5 border-b border-[#1E1E2A] transition-colors ${
                    !isPending
                      ? 'opacity-40 cursor-default'
                      : isSelected
                      ? 'bg-indigo-600/10'
                      : 'hover:bg-[#17171F] cursor-pointer'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 line-clamp-2 leading-snug">
                        {post.caption}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[11px] font-medium ${PLATFORM_COLOR[post.platform]}`}>
                          {PLATFORM_LABEL[post.platform]}
                        </span>
                        <span className="text-[11px] text-slate-600">·</span>
                        <span className="text-[11px] text-slate-600">
                          {FORMAT_LABEL[post.formato]}
                        </span>
                      </div>
                    </div>
                    {decision === 'approved' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    )}
                    {decision === 'rejected' && (
                      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Right: preview */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedPost && !decisions[selectedPost.id] ? (
          <>
            {/* Preview header */}
            <div className="px-8 py-4 border-b border-[#1E1E2A] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StatusBadge status="rascunho" />
                <span className={`text-xs font-medium ${PLATFORM_COLOR[selectedPost.platform]}`}>
                  {PLATFORM_LABEL[selectedPost.platform]}
                </span>
                <span className="text-xs text-slate-600">·</span>
                <span className="text-xs text-slate-500">
                  {FORMAT_LABEL[selectedPost.formato]}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('prev')}
                  disabled={selectedIndex <= 0}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#17171F] text-slate-500 hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-slate-600">
                  {selectedIndex + 1} / {queue.length}
                </span>
                <button
                  onClick={() => navigate('next')}
                  disabled={selectedIndex >= queue.length - 1}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#17171F] text-slate-500 hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-[600px] space-y-6">
                <div className="card p-6 space-y-5">
                  <div>
                    <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-2">
                      Caption
                    </p>
                    <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                      {selectedPost.caption}
                    </p>
                  </div>

                  {selectedPost.hashtags && (
                    <div>
                      <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-2">
                        Hashtags
                      </p>
                      <p className="text-xs text-indigo-400 leading-relaxed">
                        {selectedPost.hashtags}
                      </p>
                    </div>
                  )}

                  {selectedPost.cta && (
                    <div>
                      <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-2">
                        Call to Action
                      </p>
                      <p className="text-sm text-slate-300 italic">{selectedPost.cta}</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="card p-3">
                    <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-1">
                      Plataforma
                    </p>
                    <span className={`text-xs font-medium ${PLATFORM_COLOR[selectedPost.platform]}`}>
                      {PLATFORM_LABEL[selectedPost.platform]}
                    </span>
                  </div>
                  <div className="card p-3">
                    <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-1">
                      Formato
                    </p>
                    <span className="text-xs text-slate-300">
                      {FORMAT_LABEL[selectedPost.formato]}
                    </span>
                  </div>
                  <div className="card p-3">
                    <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-1">
                      Prioridade
                    </p>
                    <span className="text-xs text-slate-300">
                      {selectedPost.prioridade.charAt(0).toUpperCase() +
                        selectedPost.prioridade.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-8 py-5 border-t border-[#1E1E2A] flex items-center gap-3">
              <button
                onClick={handleReject}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-950/40 hover:bg-red-950/70 border border-red-900/40 text-red-400 text-sm font-medium rounded-md transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Rejeitar
                <kbd className="ml-1 text-[10px] text-red-600 bg-red-950/60 px-1.5 py-0.5 rounded">
                  R
                </kbd>
              </button>
              <button
                onClick={handleApprove}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium rounded-md transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                Aprovar
                <kbd className="ml-1 text-[10px] text-emerald-200 bg-emerald-900/60 px-1.5 py-0.5 rounded">
                  A
                </kbd>
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <CheckCheck className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <p className="text-base font-medium text-slate-300">
                {allDone ? 'Tudo em dia!' : 'Selecione um post para revisar'}
              </p>
              <p className="text-sm text-slate-600 mt-1">
                {allDone
                  ? 'Não há posts aguardando aprovação.'
                  : 'Escolha um item da fila ao lado.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
