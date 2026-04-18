import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface EmptyStateProps {
  icon?:        LucideIcon
  title:        string
  description?: string
  action?: {
    label:    string
    onClick?: () => void
  }
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-8 text-center',
        className,
      )}
    >
      {Icon && (
        <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-4">
          <Icon className="w-5 h-5 text-slate-400" />
        </div>
      )}

      <p className="text-sm font-semibold text-slate-700 tracking-tight">
        {title}
      </p>

      {description && (
        <p className="mt-1.5 text-xs text-slate-500 max-w-[280px] leading-relaxed">
          {description}
        </p>
      )}

      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 btn-primary"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
