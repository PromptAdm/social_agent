'use client'

import { Zap } from 'lucide-react'
import Link from 'next/link'
import { useCredits } from '@/hooks/useCredits'
import { cn } from '@/lib/utils/cn'

interface CreditsDisplayProps {
  className?: string
}

export function CreditsDisplay({ className }: CreditsDisplayProps) {
  const { data, isLoading } = useCredits()

  if (isLoading) {
    return (
      <div className={cn('h-7 w-20 bg-slate-100 border border-slate-200 rounded-lg animate-pulse', className)} />
    )
  }

  if (!data) return null

  const balance = data.balance
  const isLow   = balance <= 10
  const isEmpty = balance === 0

  return (
    <Link
      href="/billing"
      title={`${balance} créditos restantes (total ganho: ${data.lifetime_earned})`}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[12px] font-semibold transition-colors',
        isEmpty
          ? 'bg-red-500/10 border-red-500/25 text-red-400 hover:bg-red-500/15'
          : isLow
          ? 'bg-amber-500/10 border-amber-500/25 text-amber-400 hover:bg-amber-500/15'
          : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300',
        className,
      )}
    >
      <Zap className={cn(
        'w-3 h-3 flex-shrink-0',
        isEmpty ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-indigo-400',
      )} />
      <span>{balance.toLocaleString('pt-BR')}</span>
      <span className="text-[10px] opacity-60 font-normal">créditos</span>
    </Link>
  )
}
