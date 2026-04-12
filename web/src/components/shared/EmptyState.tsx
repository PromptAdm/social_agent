import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick?: () => void
  }
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-8 text-center',
        className
      )}
    >
      {Icon && (
        <div className="w-12 h-12 rounded-xl bg-[#17171F] border border-[#27273A] flex items-center justify-center mb-4">
          <Icon className="w-5 h-5 text-slate-600" />
        </div>
      )}
      <p className="text-[15px] font-medium text-slate-300">{title}</p>
      {description && (
        <p className="mt-1.5 text-sm text-slate-500 max-w-[320px]">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-md transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
