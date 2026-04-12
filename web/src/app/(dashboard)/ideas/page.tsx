'use client'

import { useState } from 'react'
import { Plus, Zap, ChevronRight, X, ArrowRight } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { mockIdeas, mockContentPillars } from '@/lib/mock/data'
import type { Idea, IdeaPrioridade, IdeaStatus } from '@/types'
import { Lightbulb } from 'lucide-react'

const FORMAT_LABEL: Record<string, string> = {
  carrossel: 'Carrossel',
  reels: 'Reels',
  imagem_unica: 'Imagem',
  stories: 'Stories',
  texto: 'Texto',
  video: 'Vídeo',
  live: 'Live',
  indefinido: '—',
}

const PRIORITY_CONFIG: Record<IdeaPrioridade, { label: string; className: string }> = {
  baixa: { label: 'Baixa', className: 'text-slate-500' },
  media: { label: 'Média', className: 'text-amber-400' },
  alta: { label: 'Alta', className: 'text-orange-400' },
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000 / 60 / 60)
  if (diff < 1) return 'agora'
  if (diff < 24) return `há ${diff}h`
  const days = Math.floor(diff / 24)
  if (days < 7) return `há ${days}d`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function getPillarName(pillarId: number | null) {
  if (!pillarId) return null
  return mockContentPillars.find((p) => p.id === pillarId)?.name ?? null
}

export default function IdeasPage() {
  const [statusFilter, setStatusFilter] = useState<IdeaStatus | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<IdeaPrioridade | 'all'>('all')
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null)

  const filtered = mockIdeas.filter((i) => {
    if (statusFilter !== 'all' && i.status !== statusFilter) return false
    if (priorityFilter !== 'all' && i.prioridade !== priorityFilter) return false
    return true
  })

  return (
    <div className="flex h-full">
      {/* Main content */}
      <div className="flex-1 p-8 min-w-0">
        <PageHeader
          title="Ideias"
          subtitle={`${mockIdeas.length} ideias no banco de conteúdo`}
          className="mb-6"
        >
          <button className="btn-secondary flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Gerar com IA
          </button>
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nova Ideia
          </button>
        </PageHeader>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-5">
          {/* Status */}
          <div className="flex items-center gap-1 bg-[#111118] border border-[#27273A] rounded-md p-1">
            {(['all', 'ideia', 'rascunho', 'arquivado'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {s === 'all' ? 'Todos' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {/* Priority */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as IdeaPrioridade | 'all')}
            className="text-xs bg-[#111118] border border-[#27273A] rounded-md px-3 py-1.5 text-slate-400 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">Prioridade: Todas</option>
            <option value="alta">Alta</option>
            <option value="media">Média</option>
            <option value="baixa">Baixa</option>
          </select>

          {/* Active filter chips */}
          {statusFilter !== 'all' && (
            <button
              onClick={() => setStatusFilter('all')}
              className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600/15 border border-indigo-500/30 rounded text-xs text-indigo-400 hover:bg-indigo-600/25 transition-colors"
            >
              {statusFilter}
              <X className="w-3 h-3" />
            </button>
          )}

          <span className="ml-auto text-xs text-slate-600">
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={Lightbulb}
            title="Nenhuma ideia encontrada"
            description="Ajuste os filtros ou crie uma nova ideia."
            action={{ label: '+ Nova Ideia', onClick: () => {} }}
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
                  <th className="table-th w-24">Criado</th>
                  <th className="table-th w-20" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((idea) => {
                  const pillarName = getPillarName(idea.pillar_id)
                  return (
                    <tr
                      key={idea.id}
                      className={`table-tr ${selectedIdea?.id === idea.id ? 'bg-indigo-600/5' : ''}`}
                      onClick={() =>
                        setSelectedIdea(selectedIdea?.id === idea.id ? null : idea)
                      }
                    >
                      <td className="table-td">
                        <p className="text-sm text-slate-200 line-clamp-1 font-medium">
                          {idea.title}
                        </p>
                        {pillarName && (
                          <p className="text-[11px] text-slate-600 mt-0.5">{pillarName}</p>
                        )}
                      </td>
                      <td className="table-td text-xs text-slate-500">
                        {FORMAT_LABEL[idea.formato_sugerido]}
                      </td>
                      <td className="table-td">
                        <span
                          className={`text-xs font-medium ${PRIORITY_CONFIG[idea.prioridade].className}`}
                        >
                          {PRIORITY_CONFIG[idea.prioridade].label}
                        </span>
                      </td>
                      <td className="table-td">
                        <StatusBadge status={idea.status} />
                      </td>
                      <td className="table-td text-xs text-slate-600">
                        {formatDate(idea.created_at)}
                      </td>
                      <td className="table-td">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                          <ChevronRight className="w-4 h-4 text-slate-600" />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Side panel */}
      {selectedIdea && (
        <div className="w-[360px] border-l border-[#1E1E2A] flex flex-col bg-[#0C0C11] animate-slide-in-right flex-shrink-0">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E1E2A]">
            <span className="text-sm font-semibold text-slate-200">Detalhe da Ideia</span>
            <button
              onClick={() => setSelectedIdea(null)}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#17171F] text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-100 leading-snug">
                {selectedIdea.title}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-1">
                  Status
                </p>
                <StatusBadge status={selectedIdea.status} />
              </div>
              <div>
                <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-1">
                  Prioridade
                </p>
                <span
                  className={`text-xs font-medium ${PRIORITY_CONFIG[selectedIdea.prioridade].className}`}
                >
                  {PRIORITY_CONFIG[selectedIdea.prioridade].label}
                </span>
              </div>
              <div>
                <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-1">
                  Formato
                </p>
                <span className="text-xs text-slate-400">
                  {FORMAT_LABEL[selectedIdea.formato_sugerido]}
                </span>
              </div>
              <div>
                <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-1">
                  Pilar
                </p>
                <span className="text-xs text-slate-400">
                  {getPillarName(selectedIdea.pillar_id) ?? '—'}
                </span>
              </div>
            </div>

            {selectedIdea.description && (
              <div>
                <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-2">
                  Descrição
                </p>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {selectedIdea.description}
                </p>
              </div>
            )}

            <div>
              <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-1">
                Criado em
              </p>
              <p className="text-xs text-slate-500">
                {new Date(selectedIdea.created_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          <div className="p-5 border-t border-[#1E1E2A] space-y-2">
            <button className="btn-primary w-full flex items-center justify-center gap-2">
              <ArrowRight className="w-4 h-4" />
              Converter em Post
            </button>
            <button className="btn-secondary w-full">Editar Ideia</button>
          </div>
        </div>
      )}
    </div>
  )
}
