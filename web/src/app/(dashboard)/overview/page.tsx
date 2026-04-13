'use client'

import Link from 'next/link'
import { ArrowRight, CalendarClock, CheckCheck } from 'lucide-react'
import { KpiCard }     from '@/components/shared/KpiCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useBrandStore } from '@/store/brandStore'
import { usePosts }       from '@/hooks/usePosts'
import { useIdeas }       from '@/hooks/useIdeas'
import { useAnalyticsSummary } from '@/hooks/useAnalytics'
import { useUIStore }    from '@/store/uiStore'
import { useEffect }     from 'react'
import { cn } from '@/lib/utils/cn'

// ── helpers ────────────────────────────────────────────────────────────────────

function formatScheduledDate(dateStr: string) {
  const d        = new Date(dateStr)
  const now      = new Date()
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1)
  const time     = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === now.toDateString())      return `Hoje · ${time}`
  if (d.toDateString() === tomorrow.toDateString()) return `Amanhã · ${time}`
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} · ${time}`
}

const PRIORITY_COLOR: Record<string, string> = {
  baixa:   'text-slate-500',
  media:   'text-amber-400',
  alta:    'text-orange-400',
  urgente: 'text-red-400',
}

const FORMAT_LABEL: Record<string, string> = {
  carrossel:    'Carrossel', reels:       'Reels', imagem_unica: 'Imagem',
  stories:      'Stories',  texto:        'Texto', video:        'Vídeo',
  live:         'Live',
}

const PIPELINE_ROWS = [
  { status: 'rascunho'  as const, color: 'bg-slate-600',   label: 'Rascunho' },
  { status: 'aprovado'  as const, color: 'bg-emerald-500', label: 'Aprovado' },
  { status: 'agendado'  as const, color: 'bg-indigo-500',  label: 'Agendado' },
  { status: 'publicado' as const, color: 'bg-teal-500',    label: 'Publicado' },
]

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[#17171F] rounded-lg', className)} />
}

// ── Section header helper ──────────────────────────────────────────────────────

function SectionHeader({ title, href, linkLabel }: { title: string; href: string; linkLabel?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-[13px] font-semibold text-slate-200 tracking-tight">{title}</h2>
      <Link
        href={href}
        className="flex items-center gap-0.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
      >
        {linkLabel ?? 'Ver todos'}
        <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function OverviewPage() {
  const activeBrand = useBrandStore((s) => s.activeBrand)
  const brandId     = activeBrand?.id ?? 0

  const { data: posts   = [], isLoading: postsLoading   } = usePosts(brandId)
  const { data: ideas   = [], isLoading: ideasLoading   } = useIdeas(brandId)
  const { data: summary,      isLoading: summaryLoading } = useAnalyticsSummary(brandId)

  const pendingApproval = posts.filter((p) => p.status === 'rascunho')
  const upcomingPosts   = posts
    .filter((p) => p.status === 'agendado' && p.scheduled_at)
    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())
    .slice(0, 5)
  const recentIdeas = ideas.slice(0, 5)

  const statusCounts = {
    rascunho:  posts.filter((p) => p.status === 'rascunho').length,
    aprovado:  posts.filter((p) => p.status === 'aprovado').length,
    agendado:  posts.filter((p) => p.status === 'agendado').length,
    publicado: posts.filter((p) => p.status === 'publicado').length,
  }
  const maxCount = Math.max(...Object.values(statusCounts), 1)

  const setPending = useUIStore((s) => s.setPendingApprovals)
  useEffect(() => {
    setPending(pendingApproval.length)
  }, [pendingApproval.length, setPending])

  if (!brandId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-sm font-medium text-slate-400">Selecione uma marca</p>
          <p className="text-xs text-slate-600 mt-1">
            Escolha uma marca na sidebar para ver o dashboard.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">

      {/* ── KPIs ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        {summaryLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[108px]" />)
        ) : (
          <>
            <KpiCard
              label="Posts Publicados"
              value={summary?.total_published ?? statusCounts.publicado}
              accent="emerald"
            />
            <KpiCard
              label="Aguardando Aprovação"
              value={summary?.approval_pending ?? pendingApproval.length}
              href="/approval"
              hrefLabel="Ver fila"
              accent={pendingApproval.length > 0 ? 'amber' : 'default'}
            />
            <KpiCard
              label="Taxa de Engajamento"
              value={summary ? `${(summary.engagement_rate * 100).toFixed(1)}%` : '—'}
              accent="indigo"
            />
            <KpiCard
              label="Ideias Pendentes"
              value={summary?.ideas_pending ?? ideas.filter((i) => i.status === 'ideia').length}
              href="/ideas"
              hrefLabel="Ver ideias"
              accent="default"
            />
          </>
        )}
      </div>

      {/* ── Row 2: Pipeline + Upcoming ──────────────────────────────── */}
      <div className="grid grid-cols-[1fr_320px] gap-3">

        {/* Pipeline */}
        <div className="card p-5">
          <SectionHeader title="Pipeline de Conteúdo" href="/posts" linkLabel="Ver posts" />
          {postsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-5" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {PIPELINE_ROWS.map((row) => {
                const count = statusCounts[row.status]
                const pct   = (count / maxCount) * 100
                return (
                  <div key={row.status} className="flex items-center gap-3">
                    <div className="w-[96px] flex-shrink-0">
                      <StatusBadge status={row.status} />
                    </div>
                    <div className="flex-1 h-1 bg-[#1A1A24] rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-700', row.color)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 w-5 text-right tabular-nums flex-shrink-0">
                      {count}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Upcoming posts */}
        <div className="card p-5">
          <SectionHeader title="Próximos Agendados" href="/calendar" linkLabel="Calendário" />
          {postsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-11" />)}
            </div>
          ) : upcomingPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-1.5">
              <CalendarClock className="w-8 h-8 text-slate-700" />
              <p className="text-xs text-slate-600">Nenhum post agendado.</p>
            </div>
          ) : (
            <div className="space-y-px">
              {upcomingPosts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-[#17171F] transition-colors cursor-pointer"
                >
                  <div className="w-1 h-1 rounded-full bg-indigo-500 flex-shrink-0 mt-[7px]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-slate-300 truncate leading-snug">
                      {post.caption}
                    </p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {formatScheduledDate(post.scheduled_at!)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 3: Ideas + Approval queue ───────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">

        {/* Recent ideas */}
        <div className="card p-5">
          <SectionHeader title="Ideias Recentes" href="/ideas" linkLabel="Ver banco" />
          {ideasLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9" />)}
            </div>
          ) : recentIdeas.length === 0 ? (
            <p className="text-xs text-slate-600 py-6 text-center">Nenhuma ideia ainda.</p>
          ) : (
            <div className="space-y-px">
              {recentIdeas.map((idea) => (
                <div
                  key={idea.id}
                  className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[#17171F] transition-colors cursor-pointer group"
                >
                  <div className="w-1 h-1 rounded-full bg-violet-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-slate-300 truncate group-hover:text-slate-100 transition-colors leading-snug">
                      {idea.title}
                    </p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {FORMAT_LABEL[idea.formato_sugerido] ?? idea.formato_sugerido}
                      {' · '}
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

        {/* Approval queue */}
        <div className="card p-5">
          <SectionHeader title="Fila de Aprovação" href="/approval" linkLabel="Revisar" />
          {postsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-11" />)}
            </div>
          ) : pendingApproval.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-1.5">
              <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCheck className="w-4.5 h-4.5 text-emerald-500" />
              </div>
              <p className="text-xs text-slate-500 font-medium">Tudo aprovado</p>
              <p className="text-[11px] text-slate-600">Não há posts aguardando revisão.</p>
            </div>
          ) : (
            <div className="space-y-px">
              {pendingApproval.slice(0, 4).map((post) => (
                <div
                  key={post.id}
                  className="flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-[#17171F] transition-colors cursor-pointer"
                >
                  <div className="w-[18px] h-[18px] rounded-md bg-[#17171F] border border-[#27273A] flex items-center justify-center flex-shrink-0 mt-px">
                    <span className="text-[9px] font-semibold text-slate-500 uppercase">
                      {post.platform.slice(0, 2)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-slate-300 truncate leading-snug">{post.caption}</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {FORMAT_LABEL[post.formato] ?? post.formato}
                      {' · '}
                      <span className={PRIORITY_COLOR[post.prioridade]}>{post.prioridade}</span>
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
