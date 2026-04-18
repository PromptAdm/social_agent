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
  badge:     string
  text:      string
  dot:       string
}

const CONFIG: Record<Status, StatusConfig> = {
  rascunho: {
    label: 'Rascunho',
    badge: 'bg-slate-100 border-slate-200',
    text:  'text-slate-500',
    dot:   'bg-slate-400',
  },
  aprovado: {
    label: 'Aprovado',
    badge: 'bg-emerald-50 border-emerald-200',
    text:  'text-emerald-700',
    dot:   'bg-emerald-500',
  },
  agendado: {
    label: 'Agendado',
    badge: 'bg-indigo-50 border-indigo-200',
    text:  'text-indigo-700',
    dot:   'bg-indigo-500',
  },
  publicado: {
    label: 'Publicado',
    badge: 'bg-teal-50 border-teal-200',
    text:  'text-teal-700',
    dot:   'bg-teal-500',
  },
  arquivado: {
    label: 'Arquivado',
    badge: 'bg-slate-50 border-slate-200',
    text:  'text-slate-400',
    dot:   'bg-slate-300',
  },
  rejeitado: {
    label: 'Rejeitado',
    badge: 'bg-red-50 border-red-200',
    text:  'text-red-600',
    dot:   'bg-red-500',
  },
  novo: {
    label: 'Novo',
    badge: 'bg-indigo-50 border-indigo-200',
    text:  'text-indigo-700',
    dot:   'bg-indigo-500',
  },
  contatado: {
    label: 'Contatado',
    badge: 'bg-amber-50 border-amber-200',
    text:  'text-amber-700',
    dot:   'bg-amber-500',
  },
  qualificado: {
    label: 'Qualificado',
    badge: 'bg-blue-50 border-blue-200',
    text:  'text-blue-700',
    dot:   'bg-blue-500',
  },
  convertido: {
    label: 'Convertido',
    badge: 'bg-emerald-50 border-emerald-200',
    text:  'text-emerald-700',
    dot:   'bg-emerald-500',
  },
  perdido: {
    label: 'Perdido',
    badge: 'bg-red-50 border-red-200',
    text:  'text-red-600',
    dot:   'bg-red-500',
  },
  ideia: {
    label: 'Ideia',
    badge: 'bg-violet-50 border-violet-200',
    text:  'text-violet-700',
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
