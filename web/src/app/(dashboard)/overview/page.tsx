import Link from 'next/link'
import {
  ArrowRight,
  CalendarClock,
  Instagram,
  Linkedin,
  CheckCheck,
} from 'lucide-react'
import { KpiCard } from '@/components/shared/KpiCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { mockPosts, mockIdeas } from '@/lib/mock/data'

const upcomingPosts = mockPosts
  .filter((p) => p.status === 'agendado' && p.scheduled_at)
  .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())
  .slice(0, 4)

const recentIdeas = mockIdeas.slice(0, 4)

const pendingApproval = mockPosts.filter((p) => p.status === 'rascunho').slice(0, 3)

function formatScheduledDate(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)

  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === now.toDateString()) return `Hoje · ${time}`
  if (d.toDateString() === tomorrow.toDateString()) return `Amanhã · ${time}`
  return `${d.getDate()}/${d.getMonth() + 1} · ${time}`
}

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  instagram: <Instagram className="w-3 h-3" />,
  linkedin: <Linkedin className="w-3 h-3" />,
}

const PRIORITY_COLOR: Record<string, string> = {
  baixa: 'text-slate-400',
  media: 'text-amber-400',
  alta: 'text-orange-400',
  urgente: 'text-red-400',
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

export default function OverviewPage() {
  return (
    <div className="p-8 space-y-7 max-w-[1400px]">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          label="Posts Publicados"
          value="24"
          delta={12}
          deltaLabel="% vs. mês anterior"
        />
        <KpiCard
          label="Aguardando Aprovação"
          value={pendingApproval.length}
          href="/approval"
          hrefLabel="Ver fila"
        />
        <KpiCard
          label="Engajamento Médio"
          value="4.7%"
          delta={-0.3}
          deltaLabel="% vs. mês anterior"
        />
        <KpiCard
          label="Leads Capturados"
          value="12"
          delta={3}
          deltaLabel="novos esta semana"
        />
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
          <div className="space-y-3">
            {[
              { label: 'Rascunho', count: 3, status: 'rascunho' as const, pct: 25 },
              { label: 'Aprovado', count: 2, status: 'aprovado' as const, pct: 17 },
              { label: 'Agendado', count: 3, status: 'agendado' as const, pct: 25 },
              { label: 'Publicado', count: 24, status: 'publicado' as const, pct: 100 },
            ].map((row) => (
              <div key={row.status} className="flex items-center gap-3">
                <div className="w-[100px] flex-shrink-0">
                  <StatusBadge status={row.status} />
                </div>
                <div className="flex-1 h-1.5 bg-[#1E1E2A] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      row.status === 'publicado'
                        ? 'bg-teal-500'
                        : row.status === 'agendado'
                        ? 'bg-blue-500'
                        : row.status === 'aprovado'
                        ? 'bg-emerald-500'
                        : 'bg-slate-600'
                    }`}
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-slate-400 w-6 text-right flex-shrink-0">
                  {row.count}
                </span>
              </div>
            ))}
          </div>
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
          {upcomingPosts.length === 0 ? (
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
                      {FORMAT_LABEL[post.formato]}
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
                    {FORMAT_LABEL[idea.formato_sugerido]} ·{' '}
                    <span className={PRIORITY_COLOR[idea.prioridade]}>
                      {idea.prioridade.charAt(0).toUpperCase() + idea.prioridade.slice(1)}
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
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
          {pendingApproval.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <CheckCheck className="w-8 h-8 text-emerald-500" />
              <p className="text-sm text-slate-400">Tudo aprovado</p>
              <p className="text-xs text-slate-600">Não há posts aguardando revisão.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {pendingApproval.map((post) => (
                <div
                  key={post.id}
                  className="flex items-start gap-3 p-2.5 rounded-md hover:bg-[#17171F] transition-colors cursor-pointer"
                >
                  <div className="w-6 h-6 rounded bg-[#17171F] border border-[#27273A] flex items-center justify-center flex-shrink-0 text-slate-500">
                    {PLATFORM_ICON[post.platform] ?? (
                      <span className="text-[10px]">P</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-300 truncate">{post.caption}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {FORMAT_LABEL[post.formato]} ·{' '}
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
