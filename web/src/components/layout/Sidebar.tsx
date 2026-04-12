'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  Lightbulb,
  FileText,
  CheckSquare,
  CalendarDays,
  Send,
  BarChart3,
  Building2,
  Plug,
  Settings,
  ChevronDown,
  ChevronUp,
  Hexagon,
  LogOut,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useAuthStore } from '@/store/authStore'
import { useBrandStore } from '@/store/brandStore'
import { useUIStore } from '@/store/uiStore'
import { useBrands } from '@/hooks/useBrands'

const navigation = [
  {
    section: 'VISÃO GERAL',
    items: [
      { label: 'Dashboard', href: '/overview', icon: LayoutDashboard },
    ],
  },
  {
    section: 'CONTEÚDO',
    items: [
      { label: 'Gerar Conteúdo', href: '/generate', icon: Zap, highlight: true },
      { label: 'Ideias',         href: '/ideas',    icon: Lightbulb },
      { label: 'Posts',          href: '/posts',    icon: FileText },
      { label: 'Aprovação',      href: '/approval', icon: CheckSquare, badge: true },
      { label: 'Calendário',     href: '/calendar', icon: CalendarDays },
    ],
  },
  {
    section: 'DESEMPENHO',
    items: [
      { label: 'Publicações', href: '/publishing', icon: Send },
      { label: 'Analytics', href: '/analytics', icon: BarChart3 },
    ],
  },
  {
    section: 'SISTEMA',
    items: [
      { label: 'Marcas', href: '/brands', icon: Building2 },
      { label: 'Integrações', href: '/integrations', icon: Plug },
      { label: 'Configurações', href: '/settings', icon: Settings },
    ],
  },
]

export function Sidebar() {
  const pathname        = usePathname()
  const router          = useRouter()
  const [brandOpen, setBrandOpen] = useState(false)

  // Auth & stores
  const user            = useAuthStore((s) => s.user)
  const logout          = useAuthStore((s) => s.logout)
  const activeBrand     = useBrandStore((s) => s.activeBrand)
  const setActiveBrand  = useBrandStore((s) => s.setActiveBrand)
  const pendingApprovals = useUIStore((s) => s.pendingApprovals)

  // Real brands from API
  const { data: brands = [] } = useBrands()

  // Resolve display brand (store may have stale data — prefer live)
  const displayBrand = activeBrand ?? brands[0] ?? null

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      logout()
      router.replace('/login')
    }
  }

  return (
    <aside className="w-[240px] h-screen bg-[#0C0C11] border-r border-[#1E1E2A] flex flex-col overflow-hidden flex-shrink-0">
      {/* Logo */}
      <div className="px-5 h-14 flex items-center border-b border-[#1E1E2A] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-indigo-600 rounded-md flex items-center justify-center flex-shrink-0">
            <Hexagon className="w-4 h-4 text-white fill-white/20" />
          </div>
          <span className="text-sm font-semibold text-slate-100 tracking-tight">
            Social Agent
          </span>
        </div>
      </div>

      {/* Brand Switcher */}
      <div className="px-3 py-2.5 border-b border-[#1E1E2A] flex-shrink-0">
        <button
          onClick={() => setBrandOpen(!brandOpen)}
          className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-[#17171F] transition-colors"
        >
          <div className="w-6 h-6 rounded bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-bold text-indigo-400">
              {displayBrand?.name.charAt(0) ?? '?'}
            </span>
          </div>
          <span className="text-sm text-slate-200 font-medium truncate flex-1 text-left">
            {displayBrand?.name ?? 'Selecionar marca'}
          </span>
          {brandOpen ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          )}
        </button>

        {brandOpen && (
          <div className="mt-1 bg-[#17171F] border border-[#27273A] rounded-md overflow-hidden shadow-lg">
            {brands.map((brand) => (
              <button
                key={brand.id}
                onClick={() => {
                  setActiveBrand(brand)
                  setBrandOpen(false)
                }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors',
                  brand.id === displayBrand?.id
                    ? 'bg-indigo-600/10 text-indigo-400'
                    : 'text-slate-300 hover:bg-[#1E1E2A]'
                )}
              >
                <div className="w-5 h-5 rounded bg-indigo-600/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[9px] font-bold text-indigo-400">
                    {brand.name.charAt(0)}
                  </span>
                </div>
                <span className="flex-1 text-left truncate">{brand.name}</span>
                {brand.id === displayBrand?.id && (
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
        {navigation.map((group) => (
          <div key={group.section}>
            <div className="px-2 mb-1">
              <span className="text-[10px] font-semibold tracking-widest text-slate-600 uppercase">
                {group.section}
              </span>
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/overview' && pathname.startsWith(item.href))
                const isHighlight = 'highlight' in item && item.highlight

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-sm transition-all group relative',
                      isActive
                        ? 'bg-indigo-600/10 text-indigo-300'
                        : isHighlight
                        ? 'text-indigo-400 bg-indigo-600/8 hover:bg-indigo-600/15 border border-indigo-500/20 hover:border-indigo-500/40'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#17171F]'
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-indigo-500 rounded-r" />
                    )}
                    <item.icon
                      className={cn(
                        'w-4 h-4 flex-shrink-0',
                        isActive
                          ? 'text-indigo-400'
                          : isHighlight
                          ? 'text-indigo-500'
                          : 'text-slate-600 group-hover:text-slate-400'
                      )}
                    />
                    <span className="flex-1">{item.label}</span>
                    {isHighlight && !isActive && (
                      <span className="flex-shrink-0 text-[9px] font-bold text-indigo-400 bg-indigo-600/15 border border-indigo-500/30 px-1.5 py-0.5 rounded uppercase tracking-wide">
                        IA
                      </span>
                    )}
                    {'badge' in item && item.badge && pendingApprovals > 0 ? (
                      <span className="flex-shrink-0 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-indigo-600 text-white rounded-full px-1">
                        {pendingApprovals}
                      </span>
                    ) : null}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-[#1E1E2A] flex-shrink-0">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-[#17171F] transition-colors group"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
            <span className="text-[11px] font-bold text-white">
              {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
            </span>
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate leading-tight">
              {user?.name ?? 'Usuário'}
            </p>
            <p className="text-[11px] text-slate-500 truncate leading-tight">
              {user?.email ?? ''}
            </p>
          </div>
          <LogOut className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 flex-shrink-0 transition-colors" />
        </button>
      </div>
    </aside>
  )
}
