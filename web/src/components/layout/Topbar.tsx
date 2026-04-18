'use client'

import { usePathname } from 'next/navigation'
import { Bell, Search, ChevronRight } from 'lucide-react'
import { CreditsDisplay } from '@/components/shared/CreditsDisplay'

interface PageMeta {
  title:       string
  parent?:     string
  parentHref?: string
}

const PAGE_MAP: Record<string, PageMeta> = {
  '/overview':    { title: 'Dashboard' },
  '/generate':    { title: 'Gerar com IA' },
  '/brands':      { title: 'Marcas' },
  '/ideas':       { title: 'Ideias' },
  '/posts':       { title: 'Posts' },
  '/approval':    { title: 'Aprovação' },
  '/calendar':    { title: 'Calendário' },
  '/publishing':  { title: 'Publicações' },
  '/analytics':   { title: 'Analytics' },
  '/integrations':{ title: 'Integrações' },
  '/settings':    { title: 'Configurações' },
  '/images':      { title: 'Árvore de Imagens' },
  '/video':       { title: 'Legendar Vídeo' },
  '/history':     { title: 'Histórico de projetos' },
  '/billing':     { title: 'Plano & Faturamento' },
}

function getPageMeta(pathname: string): PageMeta {
  if (PAGE_MAP[pathname]) return PAGE_MAP[pathname]
  if (pathname.includes('/strategy'))
    return { title: 'Estratégia',    parent: 'Marcas', parentHref: '/brands' }
  if (pathname.includes('/pillars'))
    return { title: 'Pilares',       parent: 'Marcas', parentHref: '/brands' }
  if (pathname.includes('/settings') && pathname.includes('/brands'))
    return { title: 'Configurações', parent: 'Marcas', parentHref: '/brands' }
  return { title: 'Social Agent' }
}

export function Topbar() {
  const pathname = usePathname()
  const meta = getPageMeta(pathname)

  return (
    <header className="h-14 bg-white border-b border-slate-200/80 flex items-center px-5 gap-4 flex-shrink-0">

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        {meta.parent && (
          <>
            <span className="text-[13px] text-slate-400">{meta.parent}</span>
            <ChevronRight className="w-3 h-3 text-slate-600 flex-shrink-0" />
          </>
        )}
        <span className="text-[13px] font-semibold text-slate-800 tracking-tight truncate">
          {meta.title}
        </span>
      </div>

      {/* Credits */}
      <CreditsDisplay />

      {/* Search trigger */}
      <button className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 w-48 cursor-pointer hover:border-slate-300 transition-colors">
        <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <span className="text-[13px] text-slate-400 flex-1 text-left select-none">Buscar…</span>
        <kbd className="text-[10px] text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono leading-tight">
          ⌘K
        </kbd>
      </button>

      {/* Notification bell */}
      <button className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
        <Bell className="w-[15px] h-[15px]" />
        <span className="absolute top-[7px] right-[7px] w-[7px] h-[7px] bg-indigo-500 rounded-full ring-[1.5px] ring-white" />
      </button>
    </header>
  )
}
