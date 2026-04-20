'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { Menu, X, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useAuthStore } from '@/store/authStore'

const links = [
  { label: 'Produto',        href: '#benefits'       },
  { label: 'Recursos',       href: '#transformation' },
  { label: 'Preços',         href: '#plans'          },
  { label: 'Por que Nezora', href: '#why'            },
]

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const isLoading       = useAuthStore((s) => s.isLoading)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const showDashboardCTA = !isLoading && isAuthenticated

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'fixed top-0 inset-x-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-white/92 backdrop-blur-xl border-b border-slate-200/60 shadow-[0_2px_20px_rgba(0,0,0,0.08)]'
          : 'bg-[rgba(3,4,18,0.28)] backdrop-blur-sm border-b border-white/[0.06]',
      )}
    >
      <nav className="max-w-6xl mx-auto px-6 sm:px-8 h-[68px] flex items-center justify-between gap-6">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group">
          <div className="relative w-8 h-8 flex-shrink-0">
            <Image
              src="/videos/logo.png"
              alt="Nezora"
              fill
              sizes="32px"
              className="object-contain rounded-lg"
              priority
            />
          </div>
          <span
            className={cn(
              'text-[16px] font-bold tracking-tight transition-colors duration-300',
              scrolled ? 'text-slate-900' : 'text-white',
            )}
          >
            Nezora
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-0.5 flex-1 justify-center">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={cn(
                'px-4 py-2 text-[14px] font-medium rounded-xl transition-all duration-150',
                scrolled
                  ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/80'
                  : 'text-white/70 hover:text-white hover:bg-white/[0.08]',
              )}
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          {showDashboardCTA ? (
            <Link
              href="/overview"
              className="inline-flex items-center gap-1.5
                px-5 py-2.5 rounded-full
                bg-indigo-600 hover:bg-indigo-500
                text-[14px] font-semibold text-white
                shadow-[0_2px_12px_rgba(99,102,241,0.35)]
                hover:shadow-[0_4px_18px_rgba(99,102,241,0.45)]
                hover:-translate-y-px active:translate-y-0
                transition-all duration-200"
            >
              <LayoutDashboard className="w-[14px] h-[14px]" />
              Ir para o Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(
                  'px-4 py-2 text-[14px] font-medium rounded-xl transition-all duration-150',
                  scrolled
                    ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/80'
                    : 'text-white/70 hover:text-white hover:bg-white/[0.08]',
                )}
              >
                Entrar
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center
                  px-5 py-2.5 rounded-full
                  bg-indigo-600 hover:bg-indigo-500
                  text-[14px] font-semibold text-white
                  shadow-[0_2px_12px_rgba(99,102,241,0.35)]
                  hover:shadow-[0_4px_18px_rgba(99,102,241,0.45)]
                  hover:-translate-y-px active:translate-y-0
                  transition-all duration-200"
              >
                Começar grátis
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className={cn(
            'md:hidden p-2 rounded-lg transition-colors',
            scrolled
              ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              : 'text-white/80 hover:text-white hover:bg-white/10',
          )}
          aria-label="Menu"
        >
          {menuOpen
            ? <X className="w-5 h-5" />
            : <Menu className="w-5 h-5" />
          }
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
            {showDashboardCTA ? (
              <Link
                href="/overview"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-center gap-1.5 px-4 py-3
                  bg-indigo-600 hover:bg-indigo-500
                  text-[14px] font-semibold text-white rounded-xl transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                Ir para o Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="block text-center px-4 py-3 text-[14px] font-medium
                    text-slate-600 border border-slate-200 rounded-xl
                    hover:bg-slate-50 transition-colors"
                >
                  Entrar
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMenuOpen(false)}
                  className="block text-center px-4 py-3
                    bg-indigo-600 hover:bg-indigo-500
                    text-[14px] font-semibold text-white rounded-xl transition-colors"
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
