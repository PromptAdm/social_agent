'use client'

import { useState } from 'react'
import { Plus, CheckCircle2, Clock, Send, X, Copy, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import type { Post, PostStatus, SocialPlatform } from '@/types'
import { FileText } from 'lucide-react'
import { useBrandStore } from '@/store/brandStore'
import { usePosts, useApprovePost, useDuplicatePost } from '@/hooks/usePosts'

const STATUS_TABS: { key: PostStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'rascunho', label: 'Rascunho' },
  { key: 'aprovado', label: 'Aprovado' },
  { key: 'agendado', label: 'Agendado' },
  { key: 'publicado', label: 'Publicado' },
]

const FORMAT_LABEL: Record<string, string> = {
  carrossel: 'Carrossel',
  reels: 'Reels',
  imagem_unica: 'Imagem',
  stories: 'Stories',
  texto: 'Texto',
  video: 'Vídeo',
  live: 'Live',
}

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

const PRIORITY_COLOR: Record<string, string> = {
  baixa: 'text-slate-500',
  media: 'text-amber-400',
  alta: 'text-orange-400',
  urgente: 'text-red-400',
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface PostRowActionsProps {
  post:        Post
  onApprove:   (id: number) => void
  onDuplicate: (id: number) => void
}

function PostRowActions({ post, onApprove, onDuplicate }: PostRowActionsProps) {
  if (post.status === 'rascunho') {
    return (
      <div className="flex items-center gap-1">
        <button
          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/50 hover:bg-emerald-950/80 border border-emerald-900/40 rounded transition-colors"
          onClick={(e) => { e.stopPropagation(); onApprove(post.id) }}
        >
          <CheckCircle2 className="w-3 h-3" />
          Aprovar
        </button>
      </div>
    )
  }
  if (post.status === 'aprovado') {
    return (
      <div className="flex items-center gap-1">
        <button
          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-blue-400 bg-blue-950/50 hover:bg-blue-950/80 border border-blue-900/40 rounded transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <Clock className="w-3 h-3" />
          Agendar
        </button>
        <button
          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-teal-400 bg-teal-950/50 hover:bg-teal-950/80 border border-teal-900/40 rounded transition-colors"
          onClick={(e) => e.stopPropagation()}
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
        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-400 bg-[#17171F] hover:bg-[#1E1E2A] border border-[#27273A] rounded transition-colors"
        onClick={(e) => { e.stopPropagation(); onDuplicate(post.id) }}
      >
        <Copy className="w-3 h-3" />
        Duplicar
      </button>
    )
  }
  return null
}

export default function PostsPage() {
  const activeBrand = useBrandStore((s) => s.activeBrand)
  const brandId     = activeBrand?.id ?? 0

  const { data: posts = [], isLoading } = usePosts(brandId)
  const approvePost  = useApprovePost()
  const duplicatePost = useDuplicatePost()

  const [activeStatus,   setActiveStatus]   = useState<PostStatus | 'all'>('all')
  const [platformFilter, setPlatformFilter] = useState<SocialPlatform | 'all'>('all')
  const [selectedPost,   setSelectedPost]   = useState<Post | null>(null)

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

  return (
    <div className="flex h-full">
      <div className="flex-1 p-8 min-w-0">
        <PageHeader
          title="Posts"
          subtitle="Crie, aprove e publique seu conteúdo."
          className="mb-6"
        >
          <button className="btn-primary flex items-center gap-2">
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
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium relative transition-colors ${
                activeStatus === tab.key
                  ? 'text-slate-100'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab.label}
              {counts[tab.key] > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    activeStatus === tab.key
                      ? 'bg-indigo-600 text-white'
                      : 'bg-[#17171F] text-slate-600'
                  }`}
                >
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
              onChange={(e) =>
                setPlatformFilter(e.target.value as SocialPlatform | 'all')
              }
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

        {/* Table */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nenhum post encontrado"
            description="Crie seu primeiro post ou ajuste os filtros."
            action={{ label: '+ Novo Post', onClick: () => {} }}
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
                  <th className="table-th w-40">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((post) => (
                  <tr
                    key={post.id}
                    className={`table-tr group ${selectedPost?.id === post.id ? 'bg-indigo-600/5' : ''}`}
                    onClick={() =>
                      setSelectedPost(selectedPost?.id === post.id ? null : post)
                    }
                  >
                    <td className="table-td">
                      <StatusBadge status={post.status} />
                    </td>
                    <td className="table-td max-w-[300px]">
                      <p className="text-sm text-slate-200 truncate">{post.caption}</p>
                    </td>
                    <td className="table-td">
                      <span
                        className={`text-xs font-medium ${PLATFORM_COLOR[post.platform]}`}
                      >
                        {PLATFORM_LABEL[post.platform]}
                      </span>
                    </td>
                    <td className="table-td text-xs text-slate-500">
                      {FORMAT_LABEL[post.formato]}
                    </td>
                    <td className="table-td">
                      <span
                        className={`text-xs font-medium ${PRIORITY_COLOR[post.prioridade]}`}
                      >
                        {post.prioridade.charAt(0).toUpperCase() + post.prioridade.slice(1)}
                      </span>
                    </td>
                    <td className="table-td text-xs text-slate-500">
                      {post.scheduled_at ? formatDate(post.scheduled_at) : '—'}
                    </td>
                    <td className="table-td">
                      <PostRowActions
                        post={post}
                        onApprove={(id) => approvePost.mutate(id)}
                        onDuplicate={(id) => duplicatePost.mutate(id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Side panel */}
      {selectedPost && (
        <div className="w-[380px] border-l border-[#1E1E2A] flex flex-col bg-[#0C0C11] animate-slide-in-right flex-shrink-0">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E1E2A]">
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

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <div>
              <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-2">Caption</p>
              <p className="text-sm text-slate-200 leading-relaxed">{selectedPost.caption}</p>
            </div>

            {selectedPost.hashtags && (
              <div>
                <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-2">
                  Hashtags
                </p>
                <p className="text-xs text-indigo-400">{selectedPost.hashtags}</p>
              </div>
            )}

            {selectedPost.cta && (
              <div>
                <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-2">CTA</p>
                <p className="text-sm text-slate-300 italic">{selectedPost.cta}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-1">
                  Plataforma
                </p>
                <span
                  className={`text-xs font-medium ${PLATFORM_COLOR[selectedPost.platform]}`}
                >
                  {PLATFORM_LABEL[selectedPost.platform]}
                </span>
              </div>
              <div>
                <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-1">
                  Formato
                </p>
                <span className="text-xs text-slate-400">
                  {FORMAT_LABEL[selectedPost.formato]}
                </span>
              </div>
              <div>
                <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-1">
                  Prioridade
                </p>
                <span
                  className={`text-xs font-medium ${PRIORITY_COLOR[selectedPost.prioridade]}`}
                >
                  {selectedPost.prioridade.charAt(0).toUpperCase() +
                    selectedPost.prioridade.slice(1)}
                </span>
              </div>
              <div>
                <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-1">
                  Criado
                </p>
                <span className="text-xs text-slate-500">
                  {new Date(selectedPost.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          </div>

          <div className="p-5 border-t border-[#1E1E2A] space-y-2">
            {selectedPost.status === 'rascunho' && (
              <button className="btn-primary w-full flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Aprovar Post
              </button>
            )}
            {selectedPost.status === 'aprovado' && (
              <>
                <button className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors">
                  <Clock className="w-4 h-4" />
                  Agendar
                </button>
                <button className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium bg-teal-700 hover:bg-teal-600 text-white rounded-md transition-colors">
                  <Send className="w-4 h-4" />
                  Publicar Agora
                </button>
              </>
            )}
            <div className="flex gap-2">
              <button className="btn-secondary flex-1">Editar</button>
              <button className="btn-secondary flex-1 flex items-center justify-center gap-1.5">
                <Copy className="w-3.5 h-3.5" />
                Duplicar
              </button>
              <button className="w-9 h-9 flex items-center justify-center border border-red-900/40 bg-red-950/20 hover:bg-red-950/50 text-red-500 rounded-md transition-colors flex-shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
