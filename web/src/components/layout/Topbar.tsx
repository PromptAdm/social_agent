'use client'

import { usePathname } from 'next/navigation'
import { Bell, Search, ChevronRight } from 'lucide-react'

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
    <header className="h-14 bg-[#0C0C11] border-b border-[#1A1A24] flex items-center px-5 gap-4 flex-shrink-0">

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        {meta.parent && (
          <>
            <span className="text-[13px] text-slate-600">{meta.parent}</span>
            <ChevronRight className="w-3 h-3 text-slate-700 flex-shrink-0" />
          </>
        )}
        <span className="text-[13px] font-semibold text-slate-200 tracking-tight truncate">
          {meta.title}
        </span>
      </div>

      {/* Search trigger */}
      <button className="hidden md:flex items-center gap-2 bg-[#111118] border border-[#1E1E2A] rounded-lg px-3 py-1.5 w-48 cursor-pointer hover:border-[#27273A] transition-colors">
        <Search className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
        <span className="text-[13px] text-slate-600 flex-1 text-left select-none">Buscar…</span>
        <kbd className="text-[10px] text-slate-700 bg-[#17171F] border border-[#27273A] px-1.5 py-0.5 rounded font-mono leading-tight">
          ⌘K
        </kbd>
      </button>

      {/* Notification bell */}
      <button className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#17171F] text-slate-600 hover:text-slate-300 transition-colors">
        <Bell className="w-[15px] h-[15px]" />
        <span className="absolute top-[7px] right-[7px] w-[7px] h-[7px] bg-indigo-500 rounded-full ring-[1.5px] ring-[#0C0C11]" />
      </button>
    </header>
  )
}
