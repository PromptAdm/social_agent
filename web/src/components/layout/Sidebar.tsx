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
  Hexagon,
  LogOut,
  Zap,
  Image,
  Video,
  History,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useAuthStore }  from '@/store/authStore'
import { useBrandStore } from '@/store/brandStore'
import { useUIStore }    from '@/store/uiStore'
import { useBrands }     from '@/hooks/useBrands'
import { usePlan }       from '@/hooks/usePlan'
import { PlanBadge }     from '@/components/billing/PlanBadge'
import { UsageMeter }    from '@/components/billing/UsageMeter'

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
  const { data: plan }  = usePlan()

  const { data: brands = [] } = useBrands()
  const displayBrand = activeBrand ?? brands[0] ?? null

  async function handleLogout() {
    try { await fetch('/api/auth/logout', { method: 'POST' }) } finally {
      logout()
      router.replace('/login')
    }
  }

  const initial = (str?: string | null) =>
    str?.charAt(0)?.toUpperCase() ?? '?'

  return (
    <aside className="w-[232px] h-screen bg-[#0C0C11] border-r border-[#1A1A24] flex flex-col overflow-hidden flex-shrink-0">

      {/* Logo */}
      <div className="h-14 px-5 flex items-center border-b border-[#1A1A24] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-500/25">
            <Hexagon className="w-[15px] h-[15px] text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[13px] font-semibold text-slate-100 tracking-tight">
            Nezora
          </span>
        </div>
      </div>

      {/* Brand switcher */}
      <div className="px-3 pt-2.5 pb-2 border-b border-[#1A1A24] flex-shrink-0">
        <button
          onClick={() => setBrandOpen(!brandOpen)}
          className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[#17171F] transition-colors group"
        >
          <div className="w-6 h-6 rounded-md bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-bold text-indigo-400">
              {initial(displayBrand?.name)}
            </span>
          </div>
          <span className="text-[13px] text-slate-200 font-medium truncate flex-1 text-left">
            {displayBrand?.name ?? 'Selecionar marca'}
          </span>
          {brandOpen
            ? <ChevronUp   className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
            : <ChevronDown className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
          }
        </button>

        {brandOpen && brands.length > 0 && (
          <div className="mt-1 bg-[#111118] border border-[#1E1E2A] rounded-lg overflow-hidden shadow-modal">
            {brands.map((brand) => (
              <button
                key={brand.id}
                onClick={() => { setActiveBrand(brand); setBrandOpen(false) }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors',
                  brand.id === displayBrand?.id
                    ? 'bg-indigo-600/10 text-indigo-300'
                    : 'text-slate-300 hover:bg-[#17171F]'
                )}
              >
                <div className="w-5 h-5 rounded bg-indigo-600/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[9px] font-bold text-indigo-400">
                    {brand.name.charAt(0)}
                  </span>
                </div>
                <span className="flex-1 text-left truncate">{brand.name}</span>
                {brand.id === displayBrand?.id && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
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
              <span className="text-[9px] font-bold tracking-[0.1em] text-slate-700 uppercase">
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
                        ? 'bg-indigo-600/14 text-indigo-300 shadow-sm'
                        : isHighlight
                        ? 'text-indigo-400 bg-indigo-600/8 hover:bg-indigo-600/14 border border-indigo-500/15 hover:border-indigo-500/25'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#13131A]',
                    )}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <span className="absolute left-0 inset-y-1.5 w-[3px] bg-gradient-to-b from-indigo-400 to-violet-500 rounded-r-full" />
                    )}

                    <item.icon
                      className={cn(
                        'w-[15px] h-[15px] flex-shrink-0',
                        isActive
                          ? 'text-indigo-400'
                          : isHighlight
                          ? 'text-indigo-500'
                          : 'text-slate-600 group-hover:text-slate-400',
                      )}
                    />

                    <span className="flex-1 font-medium leading-none">{item.label}</span>

                    {/* IA badge */}
                    {isHighlight && !isActive && (
                      <span className="text-[8px] font-bold text-indigo-500 bg-indigo-600/12 border border-indigo-500/25 px-1.5 py-0.5 rounded tracking-wide uppercase leading-none">
                        IA
                      </span>
                    )}

                    {/* Pending approvals badge */}
                    {'badge' in item && item.badge && pendingApprovals > 0 && (
                      <span className="min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-indigo-600 text-white rounded-full px-1 leading-none">
                        {pendingApprovals}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Plan section — only rendered when billing data is available */}
      {plan && (
        <div className="px-3 py-2.5 border-t border-[#1A1A24] flex-shrink-0 space-y-2">
          {/* Plan name + badge */}
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] text-slate-600 font-medium">Plano</span>
            <PlanBadge plan={plan.plan_code} />
          </div>

          {/* Usage meters — only when monetization is enabled or limits are finite */}
          {(plan.monetization_enabled || plan.limits.brands !== -1) && (
            <UsageMeter
              label="Marcas"
              used={plan.usage.brands}
              limit={plan.limits.brands}
            />
          )}
          {(plan.monetization_enabled || plan.limits.posts_per_month !== -1) && (
            <UsageMeter
              label="Posts / mês"
              used={plan.usage.posts_per_month}
              limit={plan.limits.posts_per_month}
            />
          )}
        </div>
      )}

      {/* User row */}
      <div className="px-3 py-3 border-t border-[#1A1A24] flex-shrink-0">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[#17171F] transition-colors group"
          title="Sair"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
            <span className="text-[11px] font-semibold text-white">
              {initial(user?.full_name ?? user?.email)}
            </span>
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-[13px] font-medium text-slate-200 truncate leading-tight">
              {user?.full_name ?? user?.email ?? 'Usuário'}
            </p>
            <p className="text-[11px] text-slate-600 truncate leading-tight">
              {user?.email ?? ''}
            </p>
          </div>
          <LogOut className="w-3.5 h-3.5 text-slate-700 group-hover:text-slate-500 flex-shrink-0 transition-colors" />
        </button>
      </div>
    </aside>
  )
}
