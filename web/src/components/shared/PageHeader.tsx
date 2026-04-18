import { cn } from '@/lib/utils/cn'

interface PageHeaderProps {
  title:      string
  subtitle?:  string
  children?:  React.ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, children, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div>
        <h1 className="text-base font-semibold text-slate-900 tracking-tight leading-snug">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
          {children}
        </div>
      )}
    </div>
  )
}
