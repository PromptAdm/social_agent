'use client'

import { X, CheckCircle2, XCircle, Loader2, Upload, Cpu, RefreshCw, Trash2 } from 'lucide-react'
import { useOperationsStore, type Operation, type OperationType } from '@/store/operationsStore'
import { cn } from '@/lib/utils/cn'

const TYPE_ICON: Record<OperationType, React.ComponentType<{ className?: string }>> = {
  upload:   Upload,
  generate: Cpu,
  poll:     RefreshCw,
  delete:   Trash2,
}

function OperationItem({ op }: { op: Operation }) {
  const clear = useOperationsStore((s) => s.clear)
  const Icon  = TYPE_ICON[op.type]

  return (
    <div
      className={cn(
        'flex items-start gap-3 bg-slate-50 border rounded-xl px-4 py-3 shadow-xl min-w-[260px] max-w-[340px]',
        op.status === 'success' ? 'border-emerald-500/25' :
        op.status === 'error'   ? 'border-red-500/25'     :
                                   'border-slate-200',
      )}
    >
      {/* Status icon */}
      <div className="flex-shrink-0 mt-0.5">
        {op.status === 'loading' && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />}
        {op.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
        {op.status === 'error'   && <XCircle className="w-4 h-4 text-red-400" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Icon className="w-3 h-3 text-slate-600 flex-shrink-0" />
          <p className="text-[13px] font-medium text-slate-700 truncate">{op.label}</p>
        </div>

        {/* Progress bar */}
        {op.status === 'loading' && op.progress !== undefined && (
          <div className="mt-2 h-1 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${op.progress}%` }}
            />
          </div>
        )}

        {/* Message */}
        {op.message && (
          <p className={cn(
            'text-[12px] mt-1 truncate',
            op.status === 'error' ? 'text-red-400' : 'text-slate-500',
          )}>
            {op.message}
          </p>
        )}
      </div>

      {/* Dismiss (only when done) */}
      {op.status !== 'loading' && (
        <button
          onClick={() => clear(op.id)}
          className="flex-shrink-0 text-slate-700 hover:text-slate-400 transition-colors mt-0.5"
          aria-label="Fechar"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

/** Exibição flutuante no canto inferior direito — monte no layout do dashboard. */
export function OperationFeedback() {
  const ops = useOperationsStore((s) => Object.values(s.operations))

  if (ops.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 items-end pointer-events-none">
      {ops.map((op) => (
        <div key={op.id} className="pointer-events-auto">
          <OperationItem op={op} />
        </div>
      ))}
    </div>
  )
}
