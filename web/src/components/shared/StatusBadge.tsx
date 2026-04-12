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
  label: string
  className: string
  dotClass: string
}

const CONFIG: Record<Status, StatusConfig> = {
  rascunho: {
    label: 'Rascunho',
    className: 'bg-slate-800/50 text-slate-400 border-slate-700/40',
    dotClass: 'bg-slate-500',
  },
  aprovado: {
    label: 'Aprovado',
    className: 'bg-emerald-950/70 text-emerald-400 border-emerald-900/40',
    dotClass: 'bg-emerald-400',
  },
  agendado: {
    label: 'Agendado',
    className: 'bg-blue-950/70 text-blue-400 border-blue-900/40',
    dotClass: 'bg-blue-400',
  },
  publicado: {
    label: 'Publicado',
    className: 'bg-teal-950/60 text-teal-400 border-teal-900/40',
    dotClass: 'bg-teal-400',
  },
  arquivado: {
    label: 'Arquivado',
    className: 'bg-zinc-900/60 text-slate-600 border-zinc-800/40',
    dotClass: 'bg-slate-700',
  },
  rejeitado: {
    label: 'Rejeitado',
    className: 'bg-red-950/70 text-red-400 border-red-900/40',
    dotClass: 'bg-red-400',
  },
  novo: {
    label: 'Novo',
    className: 'bg-indigo-950/70 text-indigo-400 border-indigo-900/40',
    dotClass: 'bg-indigo-400',
  },
  contatado: {
    label: 'Contatado',
    className: 'bg-amber-950/70 text-amber-400 border-amber-900/40',
    dotClass: 'bg-amber-400',
  },
  qualificado: {
    label: 'Qualificado',
    className: 'bg-blue-950/70 text-blue-400 border-blue-900/40',
    dotClass: 'bg-blue-400',
  },
  convertido: {
    label: 'Convertido',
    className: 'bg-emerald-950/70 text-emerald-400 border-emerald-900/40',
    dotClass: 'bg-emerald-400',
  },
  perdido: {
    label: 'Perdido',
    className: 'bg-red-950/70 text-red-400 border-red-900/40',
    dotClass: 'bg-red-400',
  },
  ideia: {
    label: 'Ideia',
    className: 'bg-violet-950/70 text-violet-400 border-violet-900/40',
    dotClass: 'bg-violet-400',
  },
}

interface Props {
  status: Status
  className?: string
}

export function StatusBadge({ status, className }: Props) {
  const config = CONFIG[status]
  if (!config) return null

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border tracking-wide',
        config.className,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', config.dotClass)} />
      {config.label}
    </span>
  )
}
