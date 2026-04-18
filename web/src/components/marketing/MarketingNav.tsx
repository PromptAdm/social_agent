'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Hexagon, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const links = [
  { label: 'Produto',        href: '#benefits' },
  { label: 'Transformação',  href: '#transformation' },
  { label: 'Preços',         href: '#plans' },
  { label: 'Por que Nezora', href: '#why' },
]

export function MarketingNav() {
  const [scrolled, setScrolled]   = useState(false)
  const [menuOpen, setMenuOpen]   = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'fixed top-0 inset-x-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-[#09090E]/90 backdrop-blur-md border-b border-[#1A1A24] shadow-xl'
          : 'bg-transparent',
      )}
    >
      <nav className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/35 transition-shadow">
            <Hexagon className="w-[15px] h-[15px] text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[15px] font-bold text-slate-100 tracking-tight">
            Nezora
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="px-3 py-1.5 text-[13px] text-slate-400 hover:text-slate-200 transition-colors rounded-lg hover:bg-white/5"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* CTAs */}
        <div className="hidden md:flex items-center gap-2">
          <Link
            href="/login"
            className="px-4 py-1.5 text-[13px] font-medium text-slate-300 hover:text-slate-100 transition-colors"
          >
            Entrar
          </Link>
          <Link
            href="/register"
            className="px-4 py-1.5 text-[13px] font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/30"
          >
            Começar grátis
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden p-2 text-slate-400 hover:text-slate-200 transition-colors"
          aria-label="Menu"
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#0C0C11]/95 backdrop-blur-md border-b border-[#1A1A24] px-5 py-4 space-y-1 animate-fade-in">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2.5 text-[14px] text-slate-300 hover:text-slate-100 hover:bg-white/5 rounded-lg transition-colors"
            >
              {l.label}
            </a>
          ))}
          <div className="pt-3 pb-1 flex flex-col gap-2 border-t border-[#1A1A24] mt-2">
            <Link
              href="/login"
              className="block text-center px-4 py-2 text-[13px] font-medium text-slate-300 border border-[#2A2A38] rounded-lg hover:bg-white/5 transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="block text-center px-4 py-2 text-[13px] font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all"
              onClick={() => setMenuOpen(false)}
            >
              Começar grátis
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
