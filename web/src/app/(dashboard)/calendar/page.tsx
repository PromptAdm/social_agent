'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import type { Post, SocialPlatform } from '@/types'
import { useBrandStore } from '@/store/brandStore'
import { usePosts }      from '@/hooks/usePosts'

const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]
const WEEKDAYS = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom']

const PLATFORM_STYLE: Record<SocialPlatform, { bg: string; border: string; text: string; dot: string }> = {
  instagram: { bg: 'bg-violet-950/60', border: 'border-l-violet-500', text: 'text-violet-300', dot: 'bg-violet-500' },
  linkedin:  { bg: 'bg-blue-950/60',   border: 'border-l-blue-500',   text: 'text-blue-300',   dot: 'bg-blue-500' },
  tiktok:    { bg: 'bg-pink-950/60',   border: 'border-l-pink-500',   text: 'text-pink-300',   dot: 'bg-pink-500' },
  twitter:   { bg: 'bg-sky-950/60',    border: 'border-l-sky-500',    text: 'text-sky-300',    dot: 'bg-sky-500' },
  facebook:  { bg: 'bg-blue-950/60',   border: 'border-l-blue-600',   text: 'text-blue-400',   dot: 'bg-blue-600' },
}

const STATUS_OPACITY: Record<string, string> = {
  agendado: 'opacity-100',
  publicado: 'opacity-70',
}

function getCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1)
  const lastDate = new Date(year, month + 1, 0).getDate()
  // Monday-first: Sun=0 → shift to 6, Mon=1 → 0, etc.
  const startDow = firstDay.getDay()
  const offset = startDow === 0 ? 6 : startDow - 1
  const days: (Date | null)[] = Array(offset).fill(null)
  for (let d = 1; d <= lastDate; d++) days.push(new Date(year, month, d))
  while (days.length % 7 !== 0) days.push(null)
  return days
}

function getPostsForDay(posts: Post[], date: Date): Post[] {
  return posts.filter((p) => {
    const ref = p.scheduled_at ?? p.published_at
    if (!ref) return false
    const d = new Date(ref)
    return (
      d.getFullYear() === date.getFullYear() &&
      d.getMonth() === date.getMonth() &&
      d.getDate() === date.getDate()
    )
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

const PLATFORM_FILTERS: { key: SocialPlatform | 'all'; label: string }[] = [
  { key: 'all',       label: 'Todas' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'linkedin',  label: 'LinkedIn' },
  { key: 'tiktok',    label: 'TikTok' },
  { key: 'facebook',  label: 'Facebook' },
  { key: 'twitter',   label: 'Twitter' },
]

export default function CalendarPage() {
  const activeBrand = useBrandStore((s) => s.activeBrand)
  const brandId     = activeBrand?.id ?? 0

  const { data: allPosts = [] } = usePosts(brandId)

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [platformFilter, setPlatformFilter] = useState<SocialPlatform | 'all'>('all')

  const visiblePosts = allPosts.filter((p) => {
    if (p.status !== 'agendado' && p.status !== 'publicado') return false
    if (platformFilter !== 'all' && p.platform !== platformFilter) return false
    return true
  })

  const days = getCalendarDays(year, month)
  const weeks: (Date | null)[][] = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const todayStr = now.toDateString()

  return (
    <div className="p-6 flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[#17171F] border border-[#27273A] text-slate-400 hover:text-slate-200 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-base font-semibold text-slate-100 w-40 text-center">
            {MONTHS[month]} {year}
          </h2>
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[#17171F] border border-[#27273A] text-slate-400 hover:text-slate-200 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()) }}
            className="px-3 py-1.5 text-xs border border-[#27273A] rounded-md text-slate-500 hover:text-slate-300 hover:bg-[#17171F] transition-colors">
            Hoje
          </button>
        </div>

        {/* Platform filters */}
        <div className="flex items-center gap-1">
          {PLATFORM_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setPlatformFilter(f.key)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                platformFilter === f.key
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-[#17171F]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button className="btn-primary flex items-center gap-2 text-xs px-3 py-1.5">
          <Plus className="w-3.5 h-3.5" />
          Agendar
        </button>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 card overflow-hidden flex flex-col min-h-0">
        {/* Weekday header */}
        <div className="grid grid-cols-7 border-b border-[#1E1E2A] flex-shrink-0">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-slate-600 text-center">
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        <div className="flex-1 overflow-y-auto">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 border-b border-[#1E1E2A] last:border-0" style={{ minHeight: '110px' }}>
              {week.map((day, di) => {
                const dayPosts = day ? getPostsForDay(visiblePosts, day) : []
                const isToday = day?.toDateString() === todayStr
                const isCurrentMonth = day?.getMonth() === month

                return (
                  <div
                    key={di}
                    className={`border-r border-[#1E1E2A] last:border-r-0 p-2 flex flex-col gap-1 cursor-pointer hover:bg-[#17171F]/40 transition-colors ${
                      !day ? 'bg-[#0A0A0F]' : ''
                    }`}
                  >
                    {day && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                            isToday
                              ? 'bg-indigo-600 text-white'
                              : isCurrentMonth
                              ? 'text-slate-400'
                              : 'text-slate-700'
                          }`}>
                            {day.getDate()}
                          </span>
                          {dayPosts.length > 0 && (
                            <span className="text-[9px] text-slate-600">{dayPosts.length}p</span>
                          )}
                        </div>

                        <div className="space-y-0.5 overflow-hidden">
                          {dayPosts.slice(0, 3).map((post) => {
                            const style = PLATFORM_STYLE[post.platform]
                            const ref = post.scheduled_at ?? post.published_at!
                            return (
                              <div
                                key={post.id}
                                className={`flex items-center gap-1.5 px-1.5 py-1 rounded text-[10px] border-l-2 ${style.bg} ${style.border} ${style.text} ${STATUS_OPACITY[post.status]} truncate`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${style.dot}`} />
                                <span className="truncate">{formatTime(ref)}</span>
                              </div>
                            )
                          })}
                          {dayPosts.length > 3 && (
                            <p className="text-[10px] text-slate-600 pl-1">
                              +{dayPosts.length - 3} mais
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-shrink-0">
        {Object.entries(PLATFORM_STYLE).map(([platform, style]) => (
          <div key={platform} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${style.dot}`} />
            <span className="text-[11px] text-slate-600 capitalize">{platform}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
