'use client'

import { usePathname } from 'next/navigation'
import { Bell, Search, ChevronRight, X, Zap, CheckCircle2, AlertCircle, Info } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { CreditsDisplay } from '@/components/shared/CreditsDisplay'
import { cn } from '@/lib/utils/cn'

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

// ── Notification data ────────────────────────────────────────────────────────

interface NotifEntry {
  id:      string
  type:    'feature' | 'fix' | 'info'
  title:   string
  body:    string
  date:    string
}

const NOTIFICATIONS: NotifEntry[] = [
  {
    id:    'n5',
    type:  'feature',
    title: 'Faturamento e planos',
    body:  'Página de billing com planos, uso em tempo real, trial gratuito de 7 dias e portal de gerenciamento de assinatura.',
    date:  '19 abr 2026',
  },
  {
    id:    'n4',
    type:  'feature',
    title: 'Integrações OAuth',
    body:  'Conecte Instagram, Facebook e Twitter diretamente pelo painel de integrações.',
    date:  '17 abr 2026',
  },
  {
    id:    'n3',
    type:  'fix',
    title: 'Geração de conteúdo melhorada',
    body:  'A geração de ideias agora exibe prévia da legenda gerada ao criar um rascunho de post.',
    date:  '15 abr 2026',
  },
  {
    id:    'n2',
    type:  'feature',
    title: 'Navegação da landing page',
    body:  'Usuários autenticados agora veem o botão "Ir para o Dashboard" na página inicial.',
    date:  '12 abr 2026',
  },
  {
    id:    'n1',
    type:  'info',
    title: 'Plataforma lançada',
    body:  'Nezora entrou em fase de acesso antecipado. Bem-vindo ao futuro do marketing com IA.',
    date:  '01 abr 2026',
  },
]

const NOTIF_ICON: Record<NotifEntry['type'], React.ReactNode> = {
  feature: <Zap         className="w-3.5 h-3.5 text-indigo-400" />,
  fix:     <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
  info:    <Info         className="w-3.5 h-3.5 text-blue-400" />,
}

// ── Component ────────────────────────────────────────────────────────────────

export function Topbar() {
  const pathname      = usePathname()
  const meta          = getPageMeta(pathname)
  const [bellOpen, setBellOpen] = useState(false)
  const bellRef  = useRef<HTMLDivElement>(null)

  // Close panel when clicking outside
  useEffect(() => {
    if (!bellOpen) return
    function onClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [bellOpen])

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center px-5 gap-4 flex-shrink-0">

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

      {/* Search — disabled, coming soon */}
      <div
        className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 w-48 cursor-not-allowed opacity-50 select-none"
        title="Busca em breve"
        aria-disabled
      >
        <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <span className="text-[13px] text-slate-400 flex-1 text-left">Buscar…</span>
        <kbd className="text-[10px] text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono leading-tight">
          ⌘K
        </kbd>
      </div>

      {/* Notification bell */}
      <div ref={bellRef} className="relative">
        <button
          onClick={() => setBellOpen((v) => !v)}
          className={cn(
            'relative w-8 h-8 flex items-center justify-center rounded-lg transition-colors',
            bellOpen
              ? 'bg-indigo-50 text-indigo-600'
              : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700',
          )}
          aria-label="Notificações"
        >
          <Bell className="w-[15px] h-[15px]" />
          <span className="absolute top-[7px] right-[7px] w-[7px] h-[7px] bg-blue-500 rounded-full ring-[1.5px] ring-white" />
        </button>

        {bellOpen && (
          <div className="absolute right-0 top-10 w-[340px] bg-white border border-slate-200 rounded-xl shadow-lg shadow-slate-200/80 z-50 overflow-hidden">
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="text-[13px] font-semibold text-slate-800">Atualizações da plataforma</span>
              <button
                onClick={() => setBellOpen(false)}
                className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-400 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Entries */}
            <ul className="divide-y divide-slate-100 max-h-[340px] overflow-y-auto">
              {NOTIFICATIONS.map((n) => (
                <li key={n.id} className="flex gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                  <div className="w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {NOTIF_ICON[n.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-slate-800">{n.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{n.body}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{n.date}</p>
                  </div>
                </li>
              ))}
            </ul>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50">
              <p className="text-[11px] text-slate-400 text-center">
                Essas são as últimas atualizações do sistema.
              </p>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
