import { cn } from '@/lib/utils/cn'

type Status =
  | 'rascunho'
  | 'aprovado'
  | 'agendado'
  | 'publicado'
  | 'arquivado'
  | 'rejeitado'
  | 'novo'
  | 'contatado'
  | 'qualificado'
  | 'convertido'
  | 'perdido'
  | 'ideia'

interface StatusConfig {
  label:     string
  badge:     string   // pill bg + border
  text:      string
  dot:       string
}

const CONFIG: Record<Status, StatusConfig> = {
  rascunho: {
    label: 'Rascunho',
    badge: 'bg-slate-800/40 border-slate-700/30',
    text:  'text-slate-400',
    dot:   'bg-slate-500',
  },
  aprovado: {
    label: 'Aprovado',
    badge: 'bg-emerald-950/50 border-emerald-900/25',
    text:  'text-emerald-400',
    dot:   'bg-emerald-500',
  },
  agendado: {
    label: 'Agendado',
    badge: 'bg-indigo-950/50 border-indigo-900/25',
    text:  'text-indigo-400',
    dot:   'bg-indigo-500',
  },
  publicado: {
    label: 'Publicado',
    badge: 'bg-teal-950/40 border-teal-900/20',
    text:  'text-teal-400',
    dot:   'bg-teal-500',
  },
  arquivado: {
    label: 'Arquivado',
    badge: 'bg-transparent border-slate-800/40',
    text:  'text-slate-600',
    dot:   'bg-slate-700',
  },
  rejeitado: {
    label: 'Rejeitado',
    badge: 'bg-red-950/40 border-red-900/25',
    text:  'text-red-400',
    dot:   'bg-red-500',
  },
  novo: {
    label: 'Novo',
    badge: 'bg-indigo-950/50 border-indigo-900/25',
    text:  'text-indigo-400',
    dot:   'bg-indigo-500',
  },
  contatado: {
    label: 'Contatado',
    badge: 'bg-amber-950/40 border-amber-900/20',
    text:  'text-amber-400',
    dot:   'bg-amber-500',
  },
  qualificado: {
    label: 'Qualificado',
    badge: 'bg-blue-950/40 border-blue-900/20',
    text:  'text-blue-400',
    dot:   'bg-blue-500',
  },
  convertido: {
    label: 'Convertido',
    badge: 'bg-emerald-950/50 border-emerald-900/25',
    text:  'text-emerald-400',
    dot:   'bg-emerald-500',
  },
  perdido: {
    label: 'Perdido',
    badge: 'bg-red-950/40 border-red-900/25',
    text:  'text-red-400',
    dot:   'bg-red-500',
  },
  ideia: {
    label: 'Ideia',
    badge: 'bg-violet-950/40 border-violet-900/20',
    text:  'text-violet-400',
    dot:   'bg-violet-500',
  },
}

interface Props {
  status:    Status
  className?: string
}

export function StatusBadge({ status, className }: Props) {
  const c = CONFIG[status]
  if (!c) return null

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-[3px]',
        'rounded-full border text-[10px] font-medium leading-none',
        c.badge, c.text,
        className,
      )}
    >
      <span className={cn('w-[5px] h-[5px] rounded-full flex-shrink-0', c.dot)} />
      {c.label}
    </span>
  )
}
