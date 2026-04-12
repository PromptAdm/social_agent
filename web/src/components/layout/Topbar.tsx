'use client'

import { usePathname } from 'next/navigation'
import { Bell, Search, ChevronRight } from 'lucide-react'

interface PageMeta {
  title: string
  parent?: string
  parentHref?: string
}

const PAGE_MAP: Record<string, PageMeta> = {
  '/overview': { title: 'Dashboard' },
  '/brands': { title: 'Marcas' },
  '/ideas': { title: 'Ideias' },
  '/posts': { title: 'Posts' },
  '/approval': { title: 'Aprovação' },
  '/calendar': { title: 'Calendário' },
  '/publishing': { title: 'Publicações' },
  '/analytics': { title: 'Analytics' },
  '/integrations': { title: 'Integrações' },
  '/settings': { title: 'Configurações' },
}

function getPageMeta(pathname: string): PageMeta {
  if (PAGE_MAP[pathname]) return PAGE_MAP[pathname]
  if (pathname.includes('/strategy'))
    return { title: 'Estratégia', parent: 'Marcas', parentHref: '/brands' }
  if (pathname.includes('/pillars'))
    return { title: 'Pilares', parent: 'Marcas', parentHref: '/brands' }
  if (pathname.includes('/settings') && pathname.includes('/brands'))
    return { title: 'Configurações', parent: 'Marcas', parentHref: '/brands' }
  return { title: 'Social Agent' }
}

export function Topbar() {
  const pathname = usePathname()
  const meta = getPageMeta(pathname)

  return (
    <header className="h-14 bg-[#0C0C11] border-b border-[#1E1E2A] flex items-center px-6 gap-4 flex-shrink-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        {meta.parent && (
          <>
            <span className="text-sm text-slate-500">{meta.parent}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-700 flex-shrink-0" />
          </>
        )}
        <span className="text-sm font-medium text-slate-300 truncate">{meta.title}</span>
      </div>

      {/* Search */}
      <div className="hidden md:flex items-center gap-2 bg-[#17171F] border border-[#27273A] rounded-md px-3 py-1.5 w-52 cursor-pointer hover:border-[#3F3F56] transition-colors group">
        <Search className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
        <span className="text-sm text-slate-600 flex-1 select-none">Buscar...</span>
        <div className="flex items-center gap-0.5">
          <kbd className="text-[10px] text-slate-700 bg-[#27273A] px-1 py-0.5 rounded font-mono">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Notification */}
      <button className="relative w-8 h-8 flex items-center justify-center rounded-md hover:bg-[#17171F] text-slate-500 hover:text-slate-300 transition-colors">
        <Bell className="w-4 h-4" />
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-indigo-500 rounded-full" />
      </button>
    </header>
  )
}
