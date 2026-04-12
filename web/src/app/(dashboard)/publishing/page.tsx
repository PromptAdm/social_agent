'use client'

import { Send, TrendingUp, Eye, Users } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { KpiCard }    from '@/components/shared/KpiCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { SocialPlatform } from '@/types'
import { useBrandStore }        from '@/store/brandStore'
import { usePosts }             from '@/hooks/usePosts'
import { useAnalyticsSummary }  from '@/hooks/useAnalytics'

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
const FORMAT_LABEL: Record<string, string> = {
  carrossel: 'Carrossel', reels: 'Reels', imagem_unica: 'Imagem',
  stories: 'Stories', texto: 'Texto', video: 'Vídeo', live: 'Live',
}

function formatPublishedDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function PublishingPage() {
  const activeBrand = useBrandStore((s) => s.activeBrand)
  const brandId     = activeBrand?.id ?? 0

  const { data: posts   = [] } = usePosts(brandId)
  const { data: summary      } = useAnalyticsSummary(brandId)

  const publishedPosts = posts
    .filter((p) => p.status === 'publicado')
    .sort((a, b) => new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime())

  const scheduledPosts = posts
    .filter((p) => p.status === 'agendado')
    .sort((a, b) => new Date(a.scheduled_at ?? 0).getTime() - new Date(b.scheduled_at ?? 0).getTime())

  return (
    <div className="p-8 max-w-[1300px] space-y-7">
      <PageHeader title="Publicações" subtitle="Histórico de posts publicados e próximos agendamentos." />

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Posts Publicados" value={publishedPosts.length} />
        <KpiCard label="Alcance Total"    value={summary ? `${(summary.total_reach / 1000).toFixed(1)}K` : '—'} />
        <KpiCard label="Engajamento"      value={summary ? `${(summary.engagement_rate * 100).toFixed(1)}%` : '—'} />
        <KpiCard label="Posts Agendados"  value={scheduledPosts.length} href="/calendar" hrefLabel="Ver calendário" />
      </div>

      {/* Upcoming Scheduled */}
      {scheduledPosts.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            Próximos Agendamentos
          </h2>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Post</th>
                  <th className="table-th w-28">Plataforma</th>
                  <th className="table-th w-24">Formato</th>
                  <th className="table-th w-40">Agendado para</th>
                  <th className="table-th w-28">Status</th>
                </tr>
              </thead>
              <tbody>
                {scheduledPosts.map((post) => (
                  <tr key={post.id} className="table-tr">
                    <td className="table-td">
                      <p className="text-sm text-slate-200 truncate max-w-[400px]">{post.caption}</p>
                    </td>
                    <td className="table-td">
                      <span className={`text-xs font-medium ${PLATFORM_COLOR[post.platform]}`}>
                        {PLATFORM_LABEL[post.platform]}
                      </span>
                    </td>
                    <td className="table-td text-xs text-slate-500">{FORMAT_LABEL[post.formato]}</td>
                    <td className="table-td text-xs text-blue-400">
                      {formatPublishedDate(post.scheduled_at!)}
                    </td>
                    <td className="table-td"><StatusBadge status="agendado" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Published history */}
      <div>
        <h2 className="text-sm font-semibold text-slate-300 mb-3">Histórico de Publicações</h2>
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-th">Post</th>
                <th className="table-th w-28">Plataforma</th>
                <th className="table-th w-24">Formato</th>
                <th className="table-th w-40">Publicado em</th>
                <th className="table-th w-28">
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> Alcance</span>
                </th>
                <th className="table-th w-28">
                  <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Engaj.</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {publishedPosts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="table-td text-center text-slate-600 py-8">
                    Nenhum post publicado ainda.
                  </td>
                </tr>
              ) : publishedPosts.map((post) => (
                <tr key={post.id} className="table-tr">
                  <td className="table-td">
                    <p className="text-sm text-slate-200 truncate max-w-[380px]">{post.caption}</p>
                  </td>
                  <td className="table-td">
                    <span className={`text-xs font-medium ${PLATFORM_COLOR[post.platform]}`}>
                      {PLATFORM_LABEL[post.platform]}
                    </span>
                  </td>
                  <td className="table-td text-xs text-slate-500">{FORMAT_LABEL[post.formato]}</td>
                  <td className="table-td text-xs text-slate-500">
                    {post.published_at ? formatPublishedDate(post.published_at) : '—'}
                  </td>
                  <td className="table-td">
                    <span className="text-xs text-slate-700">—</span>
                  </td>
                  <td className="table-td">
                    <span className="text-xs text-slate-700">—</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-[#1E1E2A] flex items-center justify-between">
            <span className="text-xs text-slate-600">
              Mostrando {publishedPosts.length} publicações
            </span>
            <div className="flex items-center gap-2">
              <button className="btn-ghost text-xs py-1">← Anterior</button>
              <span className="text-xs text-slate-600">Página 1 de 1</span>
              <button className="btn-ghost text-xs py-1">Próxima →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
