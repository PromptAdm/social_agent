'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Hexagon, Menu, X, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useAuthStore } from '@/store/authStore'

const links = [
  { label: 'Produto',        href: '#benefits'        },
  { label: 'Recursos',       href: '#transformation'  },
  { label: 'Preços',         href: '#plans'            },
  { label: 'Por que Nezora', href: '#why'              },
]

export function MarketingNav() {
  const [scrolled,    setScrolled]  = useState(false)
  const [menuOpen,    setMenuOpen]  = useState(false)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'fixed top-0 inset-x-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-white/85 backdrop-blur-xl border-b border-slate-200/70 shadow-[0_1px_16px_rgba(0,0,0,0.06)]'
          : 'bg-transparent',
      )}
    >
      <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600
            rounded-xl flex items-center justify-center flex-shrink-0
            shadow-md shadow-indigo-500/25 group-hover:shadow-indigo-500/40 transition-shadow">
            <Hexagon className="w-[15px] h-[15px] text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[16px] font-bold text-slate-900 tracking-tight">Nezora</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-0.5">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="px-4 py-2 text-[14px] font-medium text-slate-500
                hover:text-slate-900 hover:bg-slate-100/70
                rounded-xl transition-all duration-150"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* CTAs */}
        <div className="hidden md:flex items-center gap-2">
          {isAuthenticated ? (
            <Link
              href="/overview"
              className="btn-primary-soft inline-flex items-center gap-1.5
                px-5 py-2.5 rounded-full
                text-[14px] font-semibold text-white
                hover:-translate-y-px active:translate-y-0
                transition-transform duration-200"
            >
              <LayoutDashboard className="w-4 h-4" />
              Ir para o Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 text-[14px] font-medium text-slate-500
                  hover:text-slate-900 transition-colors"
              >
                Entrar
              </Link>
              <Link
                href="/register"
                className="btn-primary-soft inline-flex items-center
                  px-5 py-2.5 rounded-full
                  text-[14px] font-semibold text-white
                  hover:-translate-y-px active:translate-y-0
                  transition-transform duration-200"
              >
                Começar grátis
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden p-2 text-slate-500 hover:text-slate-900 transition-colors rounded-lg"
          aria-label="Menu"
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-xl border-b border-slate-200/70 px-6 py-4 space-y-0.5">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-3 text-[14px] font-medium text-slate-600
                hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors"
            >
              {l.label}
            </a>
          ))}
          <div className="pt-3 pb-1 flex flex-col gap-2 border-t border-slate-100 mt-2">
            {isAuthenticated ? (
              <Link
                href="/overview"
                onClick={() => setMenuOpen(false)}
                className="btn-primary-soft block text-center px-4 py-3
                  text-[14px] font-semibold text-white rounded-xl"
              >
                Ir para o Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="block text-center px-4 py-3 text-[14px] font-medium
                    text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Entrar
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMenuOpen(false)}
                  className="btn-primary-soft block text-center px-4 py-3
                    text-[14px] font-semibold text-white rounded-xl"
                >
                  Começar grátis
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
