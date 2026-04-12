'use client'

import Link from 'next/link'
import {
  ArrowRight,
  CalendarClock,
  Instagram,
  Linkedin,
  CheckCheck,
} from 'lucide-react'
import { KpiCard }     from '@/components/shared/KpiCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useBrandStore } from '@/store/brandStore'
import { usePosts }       from '@/hooks/usePosts'
import { useIdeas }       from '@/hooks/useIdeas'
import { useAnalyticsSummary } from '@/hooks/useAnalytics'
import { useUIStore }    from '@/store/uiStore'
import { useEffect }     from 'react'

function formatScheduledDate(dateStr: string) {
  const d        = new Date(dateStr)
  const now      = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === now.toDateString())       return `Hoje · ${time}`
  if (d.toDateString() === tomorrow.toDateString())  return `Amanhã · ${time}`
  return `${d.getDate()}/${d.getMonth() + 1} · ${time}`
}

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  instagram: <Instagram className="w-3 h-3" />,
  linkedin:  <Linkedin  className="w-3 h-3" />,
}

const PRIORITY_COLOR: Record<string, string> = {
  baixa:   'text-slate-400',
  media:   'text-amber-400',
  alta:    'text-orange-400',
  urgente: 'text-red-400',
}

const FORMAT_LABEL: Record<string, string> = {
  carrossel:   'Carrossel',
  reels:       'Reels',
  imagem_unica:'Imagem',
  stories:     'Stories',
  texto:       'Texto',
  video:       'Vídeo',
  live:        'Live',
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-[#1E1E2A] rounded ${className}`} />
}

export default function OverviewPage() {
  const activeBrand = useBrandStore((s) => s.activeBrand)
  const brandId     = activeBrand?.id ?? 0

  const { data: posts   = [], isLoading: postsLoading   } = usePosts(brandId)
  const { data: ideas   = [], isLoading: ideasLoading   } = useIdeas(brandId)
  const { data: summary,      isLoading: summaryLoading } = useAnalyticsSummary(brandId)

  // Derived data
  const pendingApproval = posts.filter((p) => p.status === 'rascunho')
  const upcomingPosts   = posts
    .filter((p) => p.status === 'agendado' && p.scheduled_at)
    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())
    .slice(0, 4)
  const recentIdeas = ideas.slice(0, 4)

  // Status counts for pipeline
  const statusCounts = {
    rascunho:  posts.filter((p) => p.status === 'rascunho').length,
    aprovado:  posts.filter((p) => p.status === 'aprovado').length,
    agendado:  posts.filter((p) => p.status === 'agendado').length,
    publicado: posts.filter((p) => p.status === 'publicado').length,
  }
  const maxCount = Math.max(...Object.values(statusCounts), 1)

  // Sync pending approvals badge in sidebar
  const setPending = useUIStore((s) => s.setPendingApprovals)
  useEffect(() => {
    setPending(pendingApproval.length)
  }, [pendingApproval.length, setPending])

  if (!brandId) {
    return (
      <div className="p-8 text-slate-500 text-sm">
        Selecione uma marca na sidebar para ver o dashboard.
      </div>
    )
  }

  return (
    <div className="p-8 space-y-7 max-w-[1400px]">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {summaryLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px]" />
          ))
        ) : (
          <>
            <KpiCard
              label="Posts Publicados"
              value={summary?.total_published ?? statusCounts.publicado}
              delta={undefined}
            />
            <KpiCard
              label="Aguardando Aprovação"
              value={summary?.approval_pending ?? pendingApproval.length}
              href="/approval"
              hrefLabel="Ver fila"
            />
            <KpiCard
              label="Taxa de Engajamento"
              value={summary ? `${(summary.engagement_rate * 100).toFixed(1)}%` : '—'}
            />
            <KpiCard
              label="Ideias Pendentes"
              value={summary?.ideas_pending ?? ideas.filter((i) => i.status === 'ideia').length}
              href="/ideas"
              hrefLabel="Ver ideias"
            />
          </>
        )}
      </div>

      {/* Row 2: Pipeline + Upcoming */}
      <div className="grid grid-cols-[1fr_340px] gap-4">
        {/* Pipeline */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-slate-200">Pipeline de Posts</h2>
            <Link
              href="/posts"
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
            >
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {postsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-6" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {(
                [
                  { label: 'Rascunho', status: 'rascunho' as const, color: 'bg-slate-600' },
                  { label: 'Aprovado', status: 'aprovado' as const, color: 'bg-emerald-500' },
                  { label: 'Agendado', status: 'agendado' as const, color: 'bg-blue-500' },
                  { label: 'Publicado', status: 'publicado' as const, color: 'bg-teal-500' },
                ] as const
              ).map((row) => {
                const count = statusCounts[row.status]
                const pct   = (count / maxCount) * 100
                return (
                  <div key={row.status} className="flex items-center gap-3">
                    <div className="w-[100px] flex-shrink-0">
                      <StatusBadge status={row.status} />
                    </div>
                    <div className="flex-1 h-1.5 bg-[#1E1E2A] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${row.color}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-400 w-6 text-right flex-shrink-0">
                      {count}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Upcoming */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-200">Próximos Agendados</h2>
            <Link
              href="/calendar"
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
            >
              Calendário <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {postsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : upcomingPosts.length === 0 ? (
            <p className="text-sm text-slate-600 py-4 text-center">
              Nenhum post agendado.
            </p>
          ) : (
            <div className="space-y-1">
              {upcomingPosts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-start gap-3 p-2.5 rounded-md hover:bg-[#17171F] transition-colors cursor-pointer"
                >
                  <CalendarClock className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-300 truncate">{post.caption}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {formatScheduledDate(post.scheduled_at!)} ·{' '}
                      {FORMAT_LABEL[post.formato] ?? post.formato}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Recent Ideas + Approval Queue */}
      <div className="grid grid-cols-2 gap-4">
        {/* Recent Ideas */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-200">Ideias Recentes</h2>
            <Link
              href="/ideas"
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
            >
              Ver todas <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {ideasLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : recentIdeas.length === 0 ? (
            <p className="text-sm text-slate-600 py-4 text-center">Nenhuma ideia ainda.</p>
          ) : (
            <div className="space-y-1">
              {recentIdeas.map((idea) => (
                <div
                  key={idea.id}
                  className="flex items-center gap-3 p-2.5 rounded-md hover:bg-[#17171F] transition-colors cursor-pointer group"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-300 truncate group-hover:text-slate-100 transition-colors">
                      {idea.title}
                    </p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {FORMAT_LABEL[idea.formato_sugerido] ?? idea.formato_sugerido} ·{' '}
                      <span className={PRIORITY_COLOR[idea.prioridade]}>
                        {idea.prioridade.charAt(0).toUpperCase() + idea.prioridade.slice(1)}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Approval Queue */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-200">Fila de Aprovação</h2>
            <Link
              href="/approval"
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
            >
              Revisar <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {postsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : pendingApproval.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <CheckCheck className="w-8 h-8 text-emerald-500" />
              <p className="text-sm text-slate-400">Tudo aprovado</p>
              <p className="text-xs text-slate-600">Não há posts aguardando revisão.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {pendingApproval.slice(0, 3).map((post) => (
                <div
                  key={post.id}
                  className="flex items-start gap-3 p-2.5 rounded-md hover:bg-[#17171F] transition-colors cursor-pointer"
                >
                  <div className="w-6 h-6 rounded bg-[#17171F] border border-[#27273A] flex items-center justify-center flex-shrink-0 text-slate-500">
                    {PLATFORM_ICON[post.platform] ?? <span className="text-[10px]">P</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-300 truncate">{post.caption}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {FORMAT_LABEL[post.formato] ?? post.formato} ·{' '}
                      <span className={PRIORITY_COLOR[post.prioridade]}>
                        {post.prioridade}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
