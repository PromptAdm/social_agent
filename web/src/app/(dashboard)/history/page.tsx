'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Image, Video, Trash2, ExternalLink, Clock, Zap, RefreshCw } from 'lucide-react'
import { useProjectHistory, useDeleteImageProject, useDeleteVideoProject } from '@/hooks/useProjects'
import { cn } from '@/lib/utils/cn'
import type { ImageProject, VideoProject, ProjectStatus } from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<ProjectStatus, string> = {
  pending:    'Na fila',
  processing: 'Processando',
  completed:  'Concluído',
  failed:     'Falhou',
}

const STATUS_COLOR: Record<ProjectStatus, string> = {
  pending:    'text-amber-400  bg-amber-400/10  border-amber-400/20',
  processing: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',
  completed:  'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  failed:     'text-red-400    bg-red-400/10    border-red-400/20',
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border',
      STATUS_COLOR[status],
    )}>
      {status === 'processing' && <RefreshCw className="w-2.5 h-2.5 mr-1 animate-spin" />}
      {STATUS_LABEL[status]}
    </span>
  )
}

function formatSize(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// ── Image row ─────────────────────────────────────────────────────────────────

function ImageRow({ project }: { project: ImageProject }) {
  const del = useDeleteImageProject()
  const dir = project.direction as Record<string, string> | null

  return (
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-[#111118] transition-colors group">
      <div className="w-8 h-8 bg-violet-600/12 border border-violet-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
        <Image className="w-3.5 h-3.5 text-violet-400" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-slate-200 truncate">
          {project.title ?? `Projeto #${project.id}`}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[11px] text-slate-600 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(project.created_at).toLocaleDateString('pt-BR')}
          </span>
          <span className="text-[11px] text-slate-600 flex items-center gap-1">
            <Zap className="w-3 h-3 text-indigo-400" />
            {project.credits_cost} créditos
          </span>
          {dir?.style && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/15 capitalize">
              {dir.style}
            </span>
          )}
          {dir?.mode && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700/40 text-slate-500 border border-slate-700/40 capitalize">
              {dir.mode}
            </span>
          )}
        </div>
      </div>

      <StatusBadge status={project.status} />

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {project.status === 'completed' && (
          <Link
            href={`/images?project=${project.id}`}
            className="p-1.5 rounded-lg text-slate-600 hover:text-violet-400 hover:bg-violet-500/8 transition-colors"
            title="Ver resultado"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        )}
        <button
          onClick={() => del.mutate(project.id)}
          disabled={del.isPending}
          className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/8 transition-colors disabled:opacity-40"
          title="Excluir projeto"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Video row ─────────────────────────────────────────────────────────────────

function VideoRow({ project }: { project: VideoProject }) {
  const del = useDeleteVideoProject()

  return (
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-[#111118] transition-colors group">
      <div className="w-8 h-8 bg-indigo-600/12 border border-indigo-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
        <Video className="w-3.5 h-3.5 text-indigo-400" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-slate-200 truncate">
          {project.title ?? project.input_file_name ?? `Vídeo #${project.id}`}
        </p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[11px] text-slate-600 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(project.created_at).toLocaleDateString('pt-BR')}
          </span>
          <span className="text-[11px] text-slate-600 flex items-center gap-1">
            <Zap className="w-3 h-3 text-indigo-400" />
            {project.credits_cost} créditos
          </span>
          {project.input_file_size && (
            <span className="text-[11px] text-slate-600">{formatSize(project.input_file_size)}</span>
          )}
          <span className="text-[11px] text-slate-600 uppercase">{project.language}</span>
        </div>
      </div>

      <StatusBadge status={project.status} />

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {project.results[0]?.file_url && (
          <a
            href={project.results[0].file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-[#1A1A24] transition-colors"
            title="Baixar legenda"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
        <button
          onClick={() => del.mutate(project.id)}
          disabled={del.isPending}
          className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/8 transition-colors disabled:opacity-40"
          title="Excluir projeto"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

type Tab = 'image' | 'video'

export default function HistoryPage() {
  const [tab, setTab] = useState<Tab>('image')
  const { data, isLoading, refetch } = useProjectHistory()

  const imageCount = data?.image_total ?? 0
  const videoCount = data?.video_total ?? 0

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-[20px] font-semibold text-slate-100 tracking-tight">Histórico de projetos</h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Projetos de geração de imagens e legendagem de vídeos.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 rounded-xl text-slate-600 hover:text-slate-300 hover:bg-[#17171F] transition-colors"
          title="Atualizar"
        >
          <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-[#09090E] border border-[#1A1A24] rounded-xl p-1 mb-6 w-fit">
        {([
          { id: 'image', icon: Image,  label: 'Imagens', count: imageCount },
          { id: 'video', icon: Video,  label: 'Vídeos',  count: videoCount },
        ] as const).map(({ id, icon: Icon, label, count }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all',
              tab === id
                ? 'bg-[#17171F] text-slate-200 shadow-sm border border-[#27273A]'
                : 'text-slate-500 hover:text-slate-300',
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            <span className={cn(
              'text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none',
              tab === id
                ? 'bg-indigo-600/20 text-indigo-400'
                : 'bg-[#17171F] text-slate-600',
            )}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-[#09090E] border border-[#1A1A24] rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tab === 'image' ? (
          data?.image_projects && data.image_projects.length > 0 ? (
            <div className="divide-y divide-[#1A1A24]">
              {data.image_projects.map((p) => <ImageRow key={p.id} project={p} />)}
            </div>
          ) : (
            <EmptyState type="image" />
          )
        ) : (
          data?.video_projects && data.video_projects.length > 0 ? (
            <div className="divide-y divide-[#1A1A24]">
              {data.video_projects.map((p) => <VideoRow key={p.id} project={p} />)}
            </div>
          ) : (
            <EmptyState type="video" />
          )
        )}
      </div>
    </div>
  )
}

function EmptyState({ type }: { type: Tab }) {
  const Icon = type === 'image' ? Image : Video
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-8">
      <div className="w-12 h-12 bg-[#17171F] border border-[#27273A] rounded-xl flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-slate-700" />
      </div>
      <p className="text-[14px] font-medium text-slate-400 mb-1">
        Nenhum projeto de {type === 'image' ? 'imagem' : 'vídeo'} ainda
      </p>
      <p className="text-[13px] text-slate-600">
        {type === 'image'
          ? 'Projetos da Árvore de Imagens aparecerão aqui.'
          : 'Projetos de Legendar Vídeo aparecerão aqui.'}
      </p>
    </div>
  )
}
