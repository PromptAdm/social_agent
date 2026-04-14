'use client'

import { useState } from 'react'
import {
  Plus, CheckCircle2, Clock, Send, X, Copy, Trash2,
  Calendar, AlertCircle,
} from 'lucide-react'
import { PageHeader }    from '@/components/shared/PageHeader'
import { StatusBadge }   from '@/components/shared/StatusBadge'
import { EmptyState }    from '@/components/shared/EmptyState'
import { PostFormModal } from '@/components/posts/PostFormModal'
import { ScheduleModal } from '@/components/posts/ScheduleModal'
import type { Post, PostStatus, SocialPlatform } from '@/types'
import { FileText } from 'lucide-react'
import { useBrandStore } from '@/store/brandStore'
import {
  usePosts, useApprovePost, useRejectPost,
  usePublishPost, useDuplicatePost, useDeletePost,
} from '@/hooks/usePosts'
import { cn } from '@/lib/utils/cn'

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_TABS: { key: PostStatus | 'all'; label: string }[] = [
  { key: 'all',       label: 'Todos'     },
  { key: 'rascunho',  label: 'Rascunho'  },
  { key: 'aprovado',  label: 'Aprovado'  },
  { key: 'agendado',  label: 'Agendado'  },
  { key: 'publicado', label: 'Publicado' },
]

const FORMAT_LABEL: Record<string, string> = {
  carrossel:    'Carrossel',
  reels:        'Reels',
  imagem_unica: 'Imagem',
  stories:      'Stories',
  texto:        'Texto',
  video:        'Vídeo',
  live:         'Live',
}

const PLATFORM_LABEL: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  linkedin:  'LinkedIn',
  twitter:   'Twitter',
  facebook:  'Facebook',
  tiktok:    'TikTok',
}

const PLATFORM_COLOR: Record<SocialPlatform, string> = {
  instagram: 'text-violet-400',
  linkedin:  'text-blue-400',
  twitter:   'text-sky-400',
  facebook:  'text-blue-500',
  tiktok:    'text-pink-400',
}

const PRIORITY_COLOR: Record<string, string> = {
  baixa:   'text-slate-500',
  media:   'text-amber-400',
  alta:    'text-orange-400',
  urgente: 'text-red-400',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

// ── DeleteConfirmModal ─────────────────────────────────────────────────────────

function DeleteConfirmModal({ post, onClose, onConfirm, loading }: {
  post: Post; onClose: () => void; onConfirm: () => void; loading: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#111118] border border-[#27273A] rounded-xl w-[400px] shadow-modal animate-fade-up">
        <div className="px-6 py-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-red-950/40 border border-red-900/30 flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Excluir post</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Tem certeza? O rascunho será excluído permanentemente.
              </p>
            </div>
          </div>
          <div className="bg-[#0C0C11] border border-[#27273A] rounded-lg px-3 py-2.5">
            <p className="text-[12px] text-slate-400 line-clamp-2">{post.caption}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#1E1E2A]">
          <button onClick={onClose} className="btn-ghost">Cancelar</button>
          <button onClick={onConfirm} disabled={loading} className="btn-danger min-w-[90px]">
            {loading
              ? <span className="flex items-center gap-1.5">
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

// ── PublishConfirmModal ────────────────────────────────────────────────────────

function PublishConfirmModal({ post, onClose, onConfirm, loading }: {
  post: Post; onClose: () => void; onConfirm: () => void; loading: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#111118] border border-[#27273A] rounded-xl w-[420px] shadow-modal animate-fade-up">
        <div className="px-6 py-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-teal-950/40 border border-teal-900/30 flex items-center justify-center flex-shrink-0">
              <Send className="w-4 h-4 text-teal-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Publicar agora</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                O post será publicado imediatamente na{' '}
                <span className="font-medium text-slate-300">{PLATFORM_LABEL[post.platform]}</span>.
                Essa ação não pode ser desfeita.
              </p>
            </div>
          </div>
          <div className="bg-[#0C0C11] border border-[#27273A] rounded-lg px-3 py-2.5">
            <p className="text-[12px] text-slate-400 line-clamp-2">{post.caption}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#1E1E2A]">
          <button onClick={onClose} className="btn-ghost">Cancelar</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="btn-primary bg-teal-700 hover:bg-teal-600 min-w-[120px]"
          >
            {loading
              ? <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Publicando…
                </span>
              : 'Publicar agora'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── PostRowActions ─────────────────────────────────────────────────────────────

interface PostRowActionsProps {
  post:        Post
  onApprove:   () => void
  onSchedule:  () => void
  onPublish:   () => void
  onDuplicate: () => void
}

function PostRowActions({ post, onApprove, onSchedule, onPublish, onDuplicate }: PostRowActionsProps) {
  if (post.status === 'rascunho') {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onApprove() }}
        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/50 hover:bg-emerald-950/80 border border-emerald-900/40 rounded transition-colors"
      >
        <CheckCircle2 className="w-3 h-3" />
        Aprovar
      </button>
    )
  }
  if (post.status === 'aprovado') {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); onSchedule() }}
          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-blue-400 bg-blue-950/50 hover:bg-blue-950/80 border border-blue-900/40 rounded transition-colors"
        >
          <Clock className="w-3 h-3" />
          Agendar
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onPublish() }}
          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-teal-400 bg-teal-950/50 hover:bg-teal-950/80 border border-teal-900/40 rounded transition-colors"
        >
          <Send className="w-3 h-3" />
          Publicar
        </button>
      </div>
    )
  }
  if (post.status === 'agendado') {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); onPublish() }}
          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-teal-400 bg-teal-950/50 hover:bg-teal-950/80 border border-teal-900/40 rounded transition-colors"
        >
          <Send className="w-3 h-3" />
          Publicar
        </button>
      </div>
    )
  }
  if (post.status === 'publicado') {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onDuplicate() }}
        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-400 bg-[#17171F] hover:bg-[#1E1E2A] border border-[#27273A] rounded transition-colors"
      >
        <Copy className="w-3 h-3" />
        Duplicar
      </button>
    )
  }
  return null
}

// ── PostsPage ──────────────────────────────────────────────────────────────────

export default function PostsPage() {
  const activeBrand = useBrandStore((s) => s.activeBrand)
  const brandId     = activeBrand?.id ?? 0

  const { data: posts = [], isLoading } = usePosts(brandId)
  const approvePost   = useApprovePost()
  const rejectPost    = useRejectPost()
  const publishPost   = usePublishPost()
  const duplicatePost = useDuplicatePost()
  const deletePost    = useDeletePost()

  const [activeStatus,   setActiveStatus]   = useState<PostStatus | 'all'>('all')
  const [platformFilter, setPlatformFilter] = useState<SocialPlatform | 'all'>('all')
  const [selectedPost,   setSelectedPost]   = useState<Post | null>(null)

  // Modals
  const [createOpen,        setCreateOpen]        = useState(false)
  const [editPost,          setEditPost]          = useState<Post | null>(null)
  const [schedulePost,      setSchedulePost]      = useState<Post | null>(null)
  const [publishTarget,     setPublishTarget]     = useState<Post | null>(null)
  const [deleteTarget,      setDeleteTarget]      = useState<Post | null>(null)

  const counts: Record<string, number> = {
    all:       posts.length,
    rascunho:  posts.filter((p) => p.status === 'rascunho').length,
    aprovado:  posts.filter((p) => p.status === 'aprovado').length,
    agendado:  posts.filter((p) => p.status === 'agendado').length,
    publicado: posts.filter((p) => p.status === 'publicado').length,
  }

  const filtered = posts.filter((p) => {
    if (activeStatus !== 'all' && p.status !== activeStatus) return false
    if (platformFilter !== 'all' && p.platform !== platformFilter) return false
    return true
  })

  function handlePublishConfirm() {
    if (!publishTarget) return
    publishPost.mutate(publishTarget.id, {
      onSuccess: () => {
        setPublishTarget(null)
        if (selectedPost?.id === publishTarget.id) setSelectedPost(null)
      },
    })
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    deletePost.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null)
        if (selectedPost?.id === deleteTarget.id) setSelectedPost(null)
      },
    })
  }

  if (!brandId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-sm font-medium text-slate-400">Selecione uma marca</p>
          <p className="text-xs text-slate-600 mt-1">
            Escolha uma marca na sidebar para ver os posts.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Modals */}
      {createOpen && (
        <PostFormModal onClose={() => setCreateOpen(false)} />
      )}
      {editPost && (
        <PostFormModal initial={editPost} onClose={() => setEditPost(null)} />
      )}
      {schedulePost && (
        <ScheduleModal post={schedulePost} onClose={() => setSchedulePost(null)} />
      )}
      {publishTarget && (
        <PublishConfirmModal
          post={publishTarget}
          onClose={() => setPublishTarget(null)}
          onConfirm={handlePublishConfirm}
          loading={publishPost.isPending}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          post={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
          loading={deletePost.isPending}
        />
      )}

      <div className="flex h-full">
        <div className="flex-1 p-6 min-w-0 overflow-y-auto">
          <PageHeader
            title="Posts"
            subtitle="Crie, aprove e publique seu conteúdo."
            className="mb-6"
          >
            <button
              onClick={() => setCreateOpen(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Novo Post
            </button>
          </PageHeader>

          {/* Status Tabs */}
          <div className="flex items-center gap-0 border-b border-[#1E1E2A] mb-5">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveStatus(tab.key)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium relative transition-colors',
                  activeStatus === tab.key ? 'text-slate-100' : 'text-slate-500 hover:text-slate-300',
                )}
              >
                {tab.label}
                {counts[tab.key] > 0 && (
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full',
                    activeStatus === tab.key
                      ? 'bg-indigo-600 text-white'
                      : 'bg-[#17171F] text-slate-600',
                  )}>
                    {counts[tab.key]}
                  </span>
                )}
                {activeStatus === tab.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-t" />
                )}
              </button>
            ))}

            {/* Platform filter */}
            <div className="ml-auto pb-1">
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value as SocialPlatform | 'all')}
                className="text-xs bg-[#111118] border border-[#27273A] rounded-md px-3 py-1.5 text-slate-400 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="all">Plataforma: Todas</option>
                <option value="instagram">Instagram</option>
                <option value="linkedin">LinkedIn</option>
                <option value="tiktok">TikTok</option>
                <option value="twitter">Twitter</option>
                <option value="facebook">Facebook</option>
              </select>
            </div>
          </div>

          {/* Loading */}
          {isLoading ? (
            <div className="card overflow-hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-[#191925] last:border-0">
                  <div className="w-20 h-5 bg-[#17171F] rounded animate-pulse" />
                  <div className="flex-1 h-4 bg-[#17171F] rounded animate-pulse" />
                  <div className="w-24 h-4 bg-[#17171F] rounded animate-pulse" />
                  <div className="w-20 h-4 bg-[#17171F] rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Nenhum post encontrado"
              description="Crie seu primeiro post ou ajuste os filtros."
              action={{ label: '+ Novo Post', onClick: () => setCreateOpen(true) }}
            />
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-th w-28">Status</th>
                    <th className="table-th">Caption</th>
                    <th className="table-th w-28">Plataforma</th>
                    <th className="table-th w-24">Formato</th>
                    <th className="table-th w-24">Prioridade</th>
                    <th className="table-th w-36">Agendado</th>
                    <th className="table-th w-44">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((post) => (
                    <tr
                      key={post.id}
                      className={cn(
                        'table-tr group',
                        selectedPost?.id === post.id && 'bg-indigo-600/5',
                      )}
                      onClick={() => setSelectedPost(selectedPost?.id === post.id ? null : post)}
                    >
                      <td className="table-td"><StatusBadge status={post.status} /></td>
                      <td className="table-td max-w-[280px]">
                        <p className="text-sm text-slate-200 truncate">{post.caption}</p>
                      </td>
                      <td className="table-td">
                        <span className={cn('text-xs font-medium', PLATFORM_COLOR[post.platform])}>
                          {PLATFORM_LABEL[post.platform]}
                        </span>
                      </td>
                      <td className="table-td text-xs text-slate-500">
                        {FORMAT_LABEL[post.formato]}
                      </td>
                      <td className="table-td">
                        <span className={cn('text-xs font-medium', PRIORITY_COLOR[post.prioridade])}>
                          {post.prioridade.charAt(0).toUpperCase() + post.prioridade.slice(1)}
                        </span>
                      </td>
                      <td className="table-td text-xs text-slate-500">
                        {post.scheduled_at ? formatDate(post.scheduled_at) : '—'}
                      </td>
                      <td className="table-td">
                        <PostRowActions
                          post={post}
                          onApprove={() => approvePost.mutate(post.id)}
                          onSchedule={() => setSchedulePost(post)}
                          onPublish={() => setPublishTarget(post)}
                          onDuplicate={() => duplicatePost.mutate(post.id)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Side panel ────────────────────────────────────────────────────── */}
        {selectedPost && (
          <div className="w-[360px] border-l border-[#1E1E2A] flex flex-col bg-[#0C0C11] flex-shrink-0 overflow-hidden">
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E1E2A] flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-200">Post</span>
                <StatusBadge status={selectedPost.status} />
              </div>
              <button
                onClick={() => setSelectedPost(null)}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#17171F] text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div>
                <p className="field-label mb-2">Caption</p>
                <p className="text-sm text-slate-200 leading-relaxed">{selectedPost.caption}</p>
              </div>

              {selectedPost.hashtags && (
                <div>
                  <p className="field-label mb-2">Hashtags</p>
                  <p className="text-xs text-indigo-400 font-mono leading-relaxed">
                    {selectedPost.hashtags}
                  </p>
                </div>
              )}

              {selectedPost.cta && (
                <div>
                  <p className="field-label mb-2">CTA</p>
                  <p className="text-sm text-slate-300 italic">{selectedPost.cta}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="field-label mb-1">Plataforma</p>
                  <span className={cn('text-xs font-medium', PLATFORM_COLOR[selectedPost.platform])}>
                    {PLATFORM_LABEL[selectedPost.platform]}
                  </span>
                </div>
                <div>
                  <p className="field-label mb-1">Formato</p>
                  <span className="text-xs text-slate-400">{FORMAT_LABEL[selectedPost.formato]}</span>
                </div>
                <div>
                  <p className="field-label mb-1">Prioridade</p>
                  <span className={cn('text-xs font-medium', PRIORITY_COLOR[selectedPost.prioridade])}>
                    {selectedPost.prioridade.charAt(0).toUpperCase() + selectedPost.prioridade.slice(1)}
                  </span>
                </div>
                <div>
                  <p className="field-label mb-1">Criado</p>
                  <span className="text-xs text-slate-500">
                    {new Date(selectedPost.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>

              {selectedPost.scheduled_at && (
                <div className="bg-blue-950/20 border border-blue-900/30 rounded-lg px-3.5 py-2.5">
                  <p className="field-label mb-1">Agendado para</p>
                  <p className="text-xs text-blue-300">
                    {new Date(selectedPost.scheduled_at).toLocaleString('pt-BR', {
                      day: '2-digit', month: 'long', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              )}

              {selectedPost.published_at && (
                <div className="bg-teal-950/20 border border-teal-900/30 rounded-lg px-3.5 py-2.5">
                  <p className="field-label mb-1">Publicado em</p>
                  <p className="text-xs text-teal-300">
                    {new Date(selectedPost.published_at).toLocaleString('pt-BR', {
                      day: '2-digit', month: 'long', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              )}
            </div>

            {/* Panel footer — actions */}
            <div className="p-4 border-t border-[#1E1E2A] space-y-2 flex-shrink-0">
              {selectedPost.status === 'rascunho' && (
                <button
                  onClick={() => { approvePost.mutate(selectedPost.id); setSelectedPost(null) }}
                  disabled={approvePost.isPending}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {approvePost.isPending ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : <CheckCircle2 className="w-4 h-4" />}
                  Aprovar Post
                </button>
              )}

              {selectedPost.status === 'aprovado' && (
                <>
                  <button
                    onClick={() => setSchedulePost(selectedPost)}
                    className="w-full flex items-center justify-center gap-2 btn bg-blue-700 hover:bg-blue-600 text-white h-9"
                  >
                    <Calendar className="w-4 h-4" />
                    Agendar
                  </button>
                  <button
                    onClick={() => setPublishTarget(selectedPost)}
                    className="w-full flex items-center justify-center gap-2 btn bg-teal-700 hover:bg-teal-600 text-white h-9"
                  >
                    <Send className="w-4 h-4" />
                    Publicar Agora
                  </button>
                </>
              )}

              {selectedPost.status === 'agendado' && (
                <button
                  onClick={() => setPublishTarget(selectedPost)}
                  className="w-full flex items-center justify-center gap-2 btn bg-teal-700 hover:bg-teal-600 text-white h-9"
                >
                  <Send className="w-4 h-4" />
                  Publicar Agora
                </button>
              )}

              {(selectedPost.status === 'rascunho' || selectedPost.status === 'aprovado') && (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditPost(selectedPost); setSelectedPost(null) }}
                    className="btn-secondary flex-1"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => { duplicatePost.mutate(selectedPost.id) }}
                    className="btn-secondary flex-1 flex items-center justify-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Duplicar
                  </button>
                  {selectedPost.status === 'rascunho' && (
                    <button
                      onClick={() => setDeleteTarget(selectedPost)}
                      className="w-9 h-9 flex items-center justify-center border border-red-900/40 bg-red-950/20 hover:bg-red-950/50 text-red-500 rounded-lg transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {selectedPost.status === 'publicado' && (
                <button
                  onClick={() => { duplicatePost.mutate(selectedPost.id) }}
                  className="btn-secondary w-full flex items-center justify-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Duplicar post
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
