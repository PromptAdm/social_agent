'use client'

import { useState } from 'react'
import { TrendingUp, TrendingDown, Download } from 'lucide-react'
import { KpiCard } from '@/components/shared/KpiCard'
import { PageHeader } from '@/components/shared/PageHeader'
import type { SocialPlatform } from '@/types'
import { useBrandStore }           from '@/store/brandStore'
import { useAnalyticsSummary, useAnalyticsSnapshots } from '@/hooks/useAnalytics'
import { FeatureGate } from '@/components/billing/FeatureGate'

const PERIODS = ['7 dias', '30 dias', '90 dias'] as const
type Period = (typeof PERIODS)[number]

const PLATFORM_COLOR: Record<string, string> = {
  instagram: 'text-violet-400',
  linkedin:  'text-blue-400',
  tiktok:    'text-pink-400',
}

const PLATFORM_BAR: Record<string, string> = {
  Instagram: 'bg-violet-500',
  LinkedIn:  'bg-blue-500',
  TikTok:    'bg-pink-500',
}

function AnalyticsContent() {
  const activeBrand = useBrandStore((s) => s.activeBrand)
  const brandId     = activeBrand?.id ?? 0

  const [period, setPeriod] = useState<Period>('30 dias')

  const { data: summary,   isLoading: summaryLoading   } = useAnalyticsSummary(brandId)
  const { data: snapshots = [], isLoading: snapshotsLoading } = useAnalyticsSnapshots(brandId)

  // Group snapshots by platform for the breakdown section
  const platformBreakdown = snapshots.reduce<Record<string, { reach: number; engagement: number; followers: number }>>((acc, s) => {
    if (!acc[s.platform]) acc[s.platform] = { reach: 0, engagement: 0, followers: 0 }
    acc[s.platform].reach      += s.reach
    acc[s.platform].engagement += s.engagement
    acc[s.platform].followers  = Math.max(acc[s.platform].followers, s.followers)
    return acc
  }, {})
  const platforms = Object.entries(platformBreakdown).map(([name, data]) => ({ name, ...data }))

  const maxReach = Math.max(...platforms.map((p) => p.reach), 1)

  return (
    <div className="p-8 max-w-[1300px] space-y-7">
      <PageHeader title="Analytics" subtitle="Desempenho do seu conteúdo nas redes sociais.">
        {/* Period selector */}
        <div className="flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-md p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                period === p ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <button className="btn-secondary flex items-center gap-2 text-xs px-3 py-1.5">
          <Download className="w-3.5 h-3.5" />
          Exportar
        </button>
      </PageHeader>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-4">
        <KpiCard label="Posts Publicados"  value={summary?.total_published ?? '—'} />
        <KpiCard label="Alcance Total"     value={summary ? `${(summary.total_reach / 1000).toFixed(1)}K` : '—'} />
        <KpiCard label="Engajamento Total" value={summary ? `${(summary.total_engagement / 1000).toFixed(1)}K` : '—'} />
        <KpiCard label="Taxa de Engajamento" value={summary ? `${(summary.engagement_rate * 100).toFixed(1)}%` : '—'} />
        <KpiCard label="Plataforma Top"    value={summary?.top_platform ?? '—'} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-[1fr_320px] gap-4">
        {/* Engagement trend — built from snapshots */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-5">Engajamento por Snapshot</h3>
          {snapshotsLoading ? (
            <div className="h-32 animate-pulse bg-slate-200 rounded" />
          ) : snapshots.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-sm text-slate-600">
              Sem dados de snapshot disponíveis.
            </div>
          ) : (
            <>
              <div className="flex items-end gap-2 h-32">
                {snapshots.slice(-12).map((s, i) => {
                  const engPct = s.reach > 0 ? (s.engagement / s.reach) * 100 : 0
                  const maxEng = Math.max(...snapshots.map((x) => x.reach > 0 ? (x.engagement / x.reach) * 100 : 0), 1)
                  const height = (engPct / maxEng) * 100
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                      <div className="relative w-full flex justify-center">
                        <div
                          className="w-full max-w-[32px] bg-indigo-600/30 hover:bg-indigo-500/50 border border-indigo-600/40 rounded-t transition-colors"
                          style={{ height: `${height}%`, minHeight: '4px' }}
                        />
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-100 border border-slate-300 rounded px-1.5 py-0.5 text-[10px] text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                          {engPct.toFixed(1)}%
                        </div>
                      </div>
                      <span className="text-[9px] text-slate-700">{s.platform.slice(0, 2)}</span>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200 flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Taxa geral: {summary ? `${(summary.engagement_rate * 100).toFixed(1)}%` : '—'}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Platform breakdown */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-5">Alcance por Plataforma</h3>
          <div className="space-y-4">
            {platforms.length === 0 ? (
              <p className="text-sm text-slate-600 py-4 text-center">Sem dados de plataforma.</p>
            ) : platforms.map((p) => {
              const engRate = p.reach > 0 ? ((p.engagement / p.reach) * 100).toFixed(1) : '0'
              return (
                <div key={p.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-slate-600 capitalize">{p.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-slate-500">
                        Eng. {engRate}%
                      </span>
                      <span className="text-xs font-semibold text-slate-700">
                        {(p.reach / 1000).toFixed(1)}K
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${PLATFORM_BAR[p.name] ?? 'bg-slate-600'}`}
                      style={{ width: `${(p.reach / maxReach) * 100}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-5 pt-4 border-t border-slate-200 space-y-2">
            <h4 className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">
              Por Formato
            </h4>
            {[
              { label: 'Reels',    value: '5.8%', bar: 90 },
              { label: 'Carrossel',value: '4.2%', bar: 65 },
              { label: 'Imagem',   value: '2.9%', bar: 45 },
              { label: 'Stories',  value: '2.1%', bar: 32 },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 w-16">{f.label}</span>
                <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500/60 rounded-full" style={{ width: `${f.bar}%` }} />
                </div>
                <span className="text-[11px] text-slate-400 w-8 text-right">{f.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Snapshots table */}
      <div>
        <h2 className="text-sm font-semibold text-slate-600 mb-3">Snapshots por Plataforma</h2>
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-th">Plataforma</th>
                <th className="table-th w-28">Seguidores</th>
                <th className="table-th w-28">Alcance</th>
                <th className="table-th w-28">Engajamento</th>
                <th className="table-th w-28">Posts</th>
                <th className="table-th w-40">Data</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.length === 0 ? (
                <tr>
                  <td colSpan={6} className="table-td text-center text-slate-600 py-8">
                    Nenhum snapshot registrado.
                  </td>
                </tr>
              ) : snapshots.map((s, i) => (
                <tr key={i} className="table-tr">
                  <td className="table-td">
                    <span className={`text-xs font-medium capitalize ${PLATFORM_COLOR[s.platform] ?? 'text-slate-400'}`}>
                      {s.platform}
                    </span>
                  </td>
                  <td className="table-td">
                    <span className="text-sm text-slate-600">{s.followers.toLocaleString('pt-BR')}</span>
                  </td>
                  <td className="table-td">
                    <span className="text-sm text-slate-600">{s.reach.toLocaleString('pt-BR')}</span>
                  </td>
                  <td className="table-td">
                    <span className="text-sm text-slate-600">{s.engagement.toLocaleString('pt-BR')}</span>
                  </td>
                  <td className="table-td">
                    <span className="text-sm text-slate-400">{s.posts_count}</span>
                  </td>
                  <td className="table-td">
                    <span className="text-xs text-slate-500">
                      {new Date(s.recorded_at).toLocaleDateString('pt-BR')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <FeatureGate feature="analytics" label="Analytics avançado">
      <AnalyticsContent />
    </FeatureGate>
  )
}
