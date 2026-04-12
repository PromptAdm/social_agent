'use client'

import { useState } from 'react'
import { Pencil, Plus, FileText, Lightbulb, MoreHorizontal } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { mockBrands, mockContentPillars } from '@/lib/mock/data'

const TABS = ['Visão Geral', 'Pilares', 'Tom de Voz', 'Configurações'] as const
type Tab = (typeof TABS)[number]

const PILLAR_ICONS = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-pink-500']

export default function StrategyPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Visão Geral')
  const brand = mockBrands[0]
  const pillars = mockContentPillars.filter((p) => p.brand_id === brand.id)

  return (
    <div className="p-8 max-w-[1000px]">
      <PageHeader
        title={brand.name}
        subtitle={`${brand.niche} · Estratégia de Conteúdo`}
        className="mb-6"
      >
        <button className="btn-secondary flex items-center gap-2">
          <Pencil className="w-3.5 h-3.5" />
          Editar
        </button>
      </PageHeader>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#1E1E2A] mb-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === tab
                ? 'text-slate-100'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-t" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'Visão Geral' && (
        <div className="space-y-4">
          {/* Identity */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Identidade da Marca
            </h3>
            <div className="flex items-start gap-5">
              <div className="w-14 h-14 rounded-xl bg-indigo-600/15 border border-indigo-500/25 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-indigo-400">
                  {brand.name.charAt(0)}
                </span>
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                    Nome
                  </p>
                  <p className="text-sm text-slate-100 font-medium">{brand.name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                    Nicho
                  </p>
                  <p className="text-sm text-slate-100">{brand.niche}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                    Descrição
                  </p>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {brand.description}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                    Tom de Voz
                  </p>
                  <p className="text-sm text-slate-100">{brand.tone_of_voice}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-4 text-center">
              <p className="text-3xl font-bold text-slate-100">{brand.post_count}</p>
              <p className="text-xs text-slate-500 mt-1 uppercase tracking-wide">Posts</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-3xl font-bold text-slate-100">{brand.idea_count}</p>
              <p className="text-xs text-slate-500 mt-1 uppercase tracking-wide">Ideias</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-3xl font-bold text-slate-100">{pillars.length}</p>
              <p className="text-xs text-slate-500 mt-1 uppercase tracking-wide">Pilares</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Pilares' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {pillars.length} pilares de conteúdo definidos.
            </p>
            <button className="btn-primary flex items-center gap-2 text-xs px-3 py-1.5">
              <Plus className="w-3.5 h-3.5" />
              Novo Pilar
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {pillars.map((pillar, i) => (
              <div key={pillar.id} className="card p-5 hover:border-[#3F3F56] transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div
                    className={`w-3 h-3 rounded-full mt-1 ${PILLAR_ICONS[i % PILLAR_ICONS.length]}`}
                  />
                  <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#17171F] text-slate-600 hover:text-slate-400 transition-colors">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>
                <h3 className="text-sm font-semibold text-slate-100 mb-1">{pillar.name}</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  {pillar.description}
                </p>
                <div className="flex items-center gap-3 pt-3 border-t border-[#1E1E2A]">
                  <span className="flex items-center gap-1 text-xs text-slate-600">
                    <FileText className="w-3 h-3" />
                    {pillar.post_count} posts
                  </span>
                  <span className="flex items-center gap-1 text-xs text-slate-600">
                    <Lightbulb className="w-3 h-3" />
                    {pillar.idea_count} ideias
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'Tom de Voz' && (
        <div className="card p-6 space-y-5">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Tom de Voz</p>
            <p className="text-sm text-slate-100">{brand.tone_of_voice}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">
              Palavras-chave da Marca
            </p>
            <div className="flex flex-wrap gap-2">
              {['Profissional', 'Didático', 'Empático', 'Objetivo'].map((kw) => (
                <span
                  key={kw}
                  className="px-2.5 py-1 text-xs bg-[#17171F] border border-[#27273A] rounded text-slate-400"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">
              Evitar
            </p>
            <div className="flex flex-wrap gap-2">
              {['Gírias', 'Linguagem técnica excessiva', 'Tom agressivo'].map((kw) => (
                <span
                  key={kw}
                  className="px-2.5 py-1 text-xs bg-red-950/40 border border-red-900/30 rounded text-red-400"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Configurações' && (
        <div className="card p-6 space-y-5">
          <p className="text-sm text-slate-500">Configurações avançadas da marca.</p>
          <div className="space-y-3">
            <button className="btn-secondary w-full text-left text-sm px-4 py-3">
              Alterar nome da marca
            </button>
            <button className="btn-secondary w-full text-left text-sm px-4 py-3">
              Gerenciar membros da equipe
            </button>
            <button className="w-full text-left text-sm px-4 py-3 border border-red-900/40 bg-red-950/30 hover:bg-red-950/50 text-red-400 rounded-md transition-colors">
              Excluir marca
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
