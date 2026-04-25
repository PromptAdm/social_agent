'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  BarChart3, Users, CreditCard, ShieldAlert,
  ScrollText, ToggleLeft, Settings,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils/cn'

const NAV = [
  { label: 'Dashboard',    href: '/admin/analytics',   icon: BarChart3 },
  { label: 'Customers',    href: '/admin/customers',   icon: Users },
  { label: 'Billing',      href: '/admin/billing',     icon: CreditCard },
  { label: 'Overrides',    href: '/admin/overrides',   icon: ToggleLeft },
  { label: 'Audit Logs',   href: '/admin/audit',       icon: ScrollText },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router          = useRouter()
  const pathname        = usePathname()
  const user            = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isLoading       = useAuthStore((s) => s.isLoading)

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated || !user?.is_superuser) {
      router.replace('/overview')
    }
  }, [isAuthenticated, isLoading, user, router])

  if (isLoading || !user?.is_superuser) return null

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Admin sidebar */}
      <aside className="w-48 flex-shrink-0 bg-slate-950 flex flex-col">
        <div className="px-4 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span className="text-[12px] font-bold text-amber-400 uppercase tracking-widest">
              Super Admin
            </span>
          </div>
        </div>

        <nav className="flex-1 py-3 space-y-px px-2">
          {NAV.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors',
                  active
                    ? 'bg-amber-500/15 text-amber-300'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800',
                )}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="px-4 py-3 border-t border-slate-800">
          <p className="text-[10px] text-slate-600 truncate">{user.email}</p>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-slate-50">
        {children}
      </div>
    </div>
  )
}
