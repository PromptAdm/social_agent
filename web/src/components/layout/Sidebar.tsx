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
  CreditCard,
  Plug,
  Settings,
  ChevronDown,
  ChevronUp,
  LogOut,
  Zap,
  Image,
  Video,
  History,
  ShieldCheck,
} from 'lucide-react'
import NextImage from 'next/image'
import { cn } from '@/lib/utils/cn'
import { useAuthStore }  from '@/store/authStore'
import { useBrandStore } from '@/store/brandStore'
import { useUIStore }    from '@/store/uiStore'
import { useBrands }     from '@/hooks/useBrands'

const navigation = [
  {
    section: 'Visão geral',
    items: [
      { label: 'Dashboard', href: '/overview', icon: LayoutDashboard },
    ],
  },
  {
    section: 'Conteúdo',
    items: [
      { label: 'Gerar com IA', href: '/generate', icon: Zap,         highlight: true },
      { label: 'Ideias',       href: '/ideas',    icon: Lightbulb },
      { label: 'Posts',        href: '/posts',    icon: FileText },
      { label: 'Aprovação',    href: '/approval', icon: CheckSquare, badge: true },
      { label: 'Calendário',   href: '/calendar', icon: CalendarDays },
    ],
  },
  {
    section: 'Módulos IA',
    items: [
      { label: 'Árvore de Imagens', href: '/images',   icon: Image,   highlight: true },
      { label: 'Legendar Vídeo',    href: '/video',    icon: Video,   highlight: true },
      { label: 'Histórico',         href: '/history',  icon: History },
    ],
  },
  {
    section: 'Desempenho',
    items: [
      { label: 'Publicações', href: '/publishing', icon: Send },
      { label: 'Analytics',   href: '/analytics',  icon: BarChart3 },
    ],
  },
  {
    section: 'Sistema',
    items: [
      { label: 'Marcas',            href: '/brands',       icon: Building2 },
      { label: 'Integrações',       href: '/integrations', icon: Plug },
      { label: 'Plano & Billing',   href: '/billing',      icon: CreditCard },
      { label: 'Configurações',     href: '/settings',     icon: Settings },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const [brandOpen, setBrandOpen] = useState(false)

  const user            = useAuthStore((s) => s.user)
  const logout          = useAuthStore((s) => s.logout)
  const activeBrand     = useBrandStore((s) => s.activeBrand)
  const setActiveBrand  = useBrandStore((s) => s.setActiveBrand)
  const pendingApprovals = useUIStore((s) => s.pendingApprovals)
  const { data: brands = [] } = useBrands()
  const displayBrand = activeBrand ?? brands[0] ?? null

  async function handleLogout() {
    try { await fetch('/api/auth/logout', { method: 'POST' }) } finally {
      logout()
      router.replace('/')
    }
  }

  const initial = (str?: string | null) =>
    str?.charAt(0)?.toUpperCase() ?? '?'

  return (
    <aside className="w-[232px] h-screen bg-white border-r border-slate-200 flex flex-col overflow-hidden flex-shrink-0">

      {/* Logo */}
      <div className="h-14 px-5 flex items-center border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="relative w-7 h-7 flex-shrink-0">
            <NextImage src="/videos/logo.png" alt="Nezora" fill sizes="28px" className="object-contain rounded-md" />
          </div>
          <span className="text-[13px] font-semibold text-slate-900 tracking-tight">
            Nezora
          </span>
        </div>
      </div>

      {/* Brand switcher */}
      <div className="px-3 pt-2.5 pb-2 border-b border-slate-200 flex-shrink-0">
        <button
          onClick={() => setBrandOpen(!brandOpen)}
          className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors group"
        >
          <div className="w-6 h-6 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-bold text-slate-600">
              {initial(displayBrand?.name)}
            </span>
          </div>
          <span className="text-[13px] text-slate-700 font-medium truncate flex-1 text-left">
            {displayBrand?.name ?? 'Selecionar marca'}
          </span>
          {brandOpen
            ? <ChevronUp   className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            : <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          }
        </button>

        {brandOpen && brands.length > 0 && (
          <div className="mt-1 bg-white border border-slate-200 rounded-lg overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
            {brands.map((brand) => (
              <button
                key={brand.id}
                onClick={() => { setActiveBrand(brand); setBrandOpen(false) }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors',
                  brand.id === displayBrand?.id
                    ? 'bg-slate-50 text-slate-900 font-medium'
                    : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                <div className="w-5 h-5 rounded bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-[9px] font-bold text-slate-500">
                    {brand.name.charAt(0)}
                  </span>
                </div>
                <span className="flex-1 text-left truncate">{brand.name}</span>
                {brand.id === displayBrand?.id && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
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
            {/* Section label */}
            <div className="px-2 mb-1">
              <span className="text-[9px] font-bold tracking-[0.1em] text-slate-400 uppercase">
                {group.section}
              </span>
            </div>

            <div className="space-y-px">
              {group.items.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== '/overview' && pathname.startsWith(item.href))
                const isHighlight = 'highlight' in item && item.highlight

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'relative flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] transition-all group',
                      isActive
                        ? 'bg-slate-100 text-slate-900'
                        : isHighlight
                        ? 'text-blue-600 hover:bg-blue-50/60'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/80',
                    )}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <span className="absolute left-0 inset-y-1.5 w-[3px] bg-blue-600 rounded-r-full" />
                    )}

                    <item.icon
                      className={cn(
                        'w-[15px] h-[15px] flex-shrink-0',
                        isActive
                          ? 'text-blue-600'
                          : isHighlight
                          ? 'text-blue-500'
                          : 'text-slate-400 group-hover:text-slate-600',
                      )}
                    />

                    <span className="flex-1 font-medium leading-none">{item.label}</span>

                    {/* IA badge */}
                    {isHighlight && !isActive && (
                      <span className="text-[8px] font-bold text-blue-600 bg-blue-50 border border-blue-200/60 px-1.5 py-0.5 rounded tracking-wide uppercase leading-none">
                        IA
                      </span>
                    )}

                    {/* Pending approvals badge */}
                    {'badge' in item && item.badge && pendingApprovals > 0 && (
                      <span className="min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-blue-600 text-white rounded-full px-1 leading-none">
                        {pendingApprovals}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}

        {/* Superuser-only admin section */}
        {user?.is_superuser && (
          <div>
            <div className="px-2 mb-1">
              <span className="text-[9px] font-bold tracking-[0.1em] text-amber-500 uppercase">
                Admin
              </span>
            </div>
            <div className="space-y-px">
              {(() => {
                const href = '/admin/analytics'
                const isActive = pathname.startsWith(href)
                return (
                  <Link
                    href={href}
                    className={cn(
                      'relative flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] transition-all group',
                      isActive
                        ? 'bg-amber-50 text-amber-900'
                        : 'text-amber-600 hover:bg-amber-50/60',
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 inset-y-1.5 w-[3px] bg-amber-500 rounded-r-full" />
                    )}
                    <ShieldCheck className={cn('w-[15px] h-[15px] flex-shrink-0', isActive ? 'text-amber-600' : 'text-amber-500')} />
                    <span className="flex-1 font-medium leading-none">Analytics</span>
                  </Link>
                )
              })()}
            </div>
          </div>
        )}
      </nav>

      {/* User row */}
      <div className="px-3 py-3 border-t border-slate-200 flex-shrink-0">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors group"
          title="Sair"
        >
          <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
            <span className="text-[11px] font-semibold text-slate-600">
              {initial(user?.full_name ?? user?.email)}
            </span>
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-[13px] font-medium text-slate-700 truncate leading-tight">
              {user?.full_name ?? user?.email ?? 'Usuário'}
            </p>
            <p className="text-[11px] text-slate-400 truncate leading-tight">
              {user?.email ?? ''}
            </p>
          </div>
          <LogOut className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 flex-shrink-0 transition-colors" />
        </button>
      </div>
    </aside>
  )
}
