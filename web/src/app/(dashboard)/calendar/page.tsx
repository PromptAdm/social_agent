'use client'

import { useState } from 'react'
import {
  ChevronLeft, ChevronRight, Plus, X,
  Calendar as CalIcon, Clock, LayoutGrid, Rows3,
} from 'lucide-react'
import type { Post, SocialPlatform, PostStatus } from '@/types'
import { useBrandStore }    from '@/store/brandStore'
import { usePosts, useSchedulePost } from '@/hooks/usePosts'
import { cn } from '@/lib/utils/cn'

// ── constants ──────────────────────────────────────────────────────────────────

const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]
const WEEKDAYS_SHORT = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom']
const WEEKDAYS_FULL  = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo']

const PLATFORM_STYLE: Record<SocialPlatform, { bg: string; border: string; text: string; dot: string }> = {
  instagram: { bg: 'bg-violet-950/70', border: 'border-l-violet-500', text: 'text-violet-300', dot: 'bg-violet-500' },
  linkedin:  { bg: 'bg-blue-950/70',   border: 'border-l-blue-500',   text: 'text-blue-300',   dot: 'bg-blue-500' },
  tiktok:    { bg: 'bg-pink-950/70',   border: 'border-l-pink-500',   text: 'text-pink-300',   dot: 'bg-pink-500' },
  twitter:   { bg: 'bg-sky-950/70',    border: 'border-l-sky-500',    text: 'text-sky-300',    dot: 'bg-sky-500' },
  facebook:  { bg: 'bg-blue-950/70',   border: 'border-l-blue-600',   text: 'text-blue-400',   dot: 'bg-blue-600' },
}

const PLATFORM_LABEL: Record<SocialPlatform, string> = {
  instagram: 'Instagram', linkedin: 'LinkedIn', tiktok: 'TikTok',
  twitter: 'Twitter', facebook: 'Facebook',
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string }> = {
  agendado:  { label: 'Agendado',  dot: 'bg-indigo-400', text: 'text-indigo-400' },
  publicado: { label: 'Publicado', dot: 'bg-emerald-400', text: 'text-emerald-400' },
  rascunho:  { label: 'Rascunho',  dot: 'bg-slate-500',  text: 'text-slate-500' },
  aprovado:  { label: 'Aprovado',  dot: 'bg-amber-400',  text: 'text-amber-400' },
}

const FORMAT_LABEL: Record<string, string> = {
  carrossel: 'Carrossel', reels: 'Reels', imagem_unica: 'Imagem',
  stories: 'Stories', texto: 'Texto', video: 'Vídeo', live: 'Live',
}

const PLATFORM_FILTERS: { key: SocialPlatform | 'all'; label: string }[] = [
  { key: 'all', label: 'Todas' }, { key: 'instagram', label: 'Instagram' },
  { key: 'linkedin', label: 'LinkedIn' }, { key: 'tiktok', label: 'TikTok' },
  { key: 'facebook', label: 'Facebook' }, { key: 'twitter', label: 'Twitter' },
]

const STATUS_FILTERS: { key: PostStatus | 'all'; label: string }[] = [
  { key: 'all',       label: 'Todos' },
  { key: 'agendado',  label: 'Agendado' },
  { key: 'publicado', label: 'Publicado' },
  { key: 'aprovado',  label: 'Aprovado' },
  { key: 'rascunho',  label: 'Rascunho' },
]

// ── helpers ────────────────────────────────────────────────────────────────────

function getCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1)
  const lastDate = new Date(year, month + 1, 0).getDate()
  const startDow = firstDay.getDay()
  const offset   = startDow === 0 ? 6 : startDow - 1
  const days: (Date | null)[] = Array(offset).fill(null)
  for (let d = 1; d <= lastDate; d++) days.push(new Date(year, month, d))
  while (days.length % 7 !== 0) days.push(null)
  return days
}

function getWeekDays(date: Date): Date[] {
  const day = date.getDay()
  const monday = new Date(date)
  monday.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function getPostsForDay(posts: Post[], date: Date): Post[] {
  return posts
    .filter((p) => {
      const ref = p.scheduled_at ?? p.published_at
      if (!ref) return false
      const d = new Date(ref)
      return (
        d.getFullYear() === date.getFullYear() &&
        d.getMonth()    === date.getMonth() &&
        d.getDate()     === date.getDate()
      )
    })
    .sort((a, b) => {
      const ta = new Date(a.scheduled_at ?? a.published_at ?? 0).getTime()
      const tb = new Date(b.scheduled_at ?? b.published_at ?? 0).getTime()
      return ta - tb
    })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── ScheduleModal (from calendar) ─────────────────────────────────────────────

interface ScheduleModalProps {
  post: Post
  onConfirm: (isoDate: string) => void
  onClose: () => void
}

function ScheduleModal({ post, onConfirm, onClose }: ScheduleModalProps) {
  const existingDate = post.scheduled_at
    ? new Date(post.scheduled_at).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10)
  const existingTime = post.scheduled_at
    ? new Date(post.scheduled_at).toTimeString().slice(0, 5)
    : '09:00'

  const [date, setDate] = useState(existingDate)
  const [time, setTime] = useState(existingTime)

  const label = date && time
    ? new Date(`${date}T${time}`).toLocaleString('pt-BR', {
        weekday: 'long', day: '2-digit', month: 'long',
        hour: '2-digit', minute: '2-digit',
      })
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#111118] border border-[#27273A] rounded-xl w-[420px] shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E1E2A]">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              {post.scheduled_at ? 'Reagendar publicação' : 'Agendar publicação'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{post.caption.slice(0, 55)}…</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md text-slate-600 hover:text-slate-400 hover:bg-[#17171F] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Data</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#17171F] border border-[#27273A] rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Horário</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                className="w-full bg-[#17171F] border border-[#27273A] rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors" />
            </div>
          </div>
          {label && (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-indigo-950/40 border border-indigo-500/20 rounded-lg">
              <Clock className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
              <p className="text-xs text-indigo-300 capitalize">{label}</p>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-[#1E1E2A]">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => { if (date && time) onConfirm(new Date(`${date}T${time}`).toISOString()) }}
            disabled={!date || !time}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
          >
            <CalIcon className="w-3.5 h-3.5" />
            {post.scheduled_at ? 'Reagendar' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── PostDetailPanel ────────────────────────────────────────────────────────────

interface PostDetailPanelProps {
  post: Post
  onClose: () => void
  onReschedule: (post: Post) => void
}

function PostDetailPanel({ post, onClose, onReschedule }: PostDetailPanelProps) {
  const style     = PLATFORM_STYLE[post.platform]
  const ref       = post.scheduled_at ?? post.published_at
  const statusCfg = STATUS_CONFIG[post.status] ?? { label: post.status, dot: 'bg-slate-500', text: 'text-slate-400' }

  return (
    <div className="w-[320px] border-l border-[#1E1E2A] flex flex-col flex-shrink-0 bg-[#0C0C11] animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E1E2A]">
        <div className="flex items-center gap-2">
          <span className={cn('w-2 h-2 rounded-full flex-shrink-0', style.dot)} />
          <span className={cn('text-xs font-semibold', style.text)}>{PLATFORM_LABEL[post.platform]}</span>
          <span className="text-xs text-slate-600">·</span>
          <span className="text-xs text-slate-500">{FORMAT_LABEL[post.formato]}</span>
        </div>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md text-slate-600 hover:text-slate-400 hover:bg-[#17171F] transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Status + time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className={cn('w-1.5 h-1.5 rounded-full', statusCfg.dot)} />
            <span className={cn('text-xs font-medium', statusCfg.text)}>{statusCfg.label}</span>
          </div>
          {ref && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="w-3 h-3" />
              <span>{formatTime(ref)}</span>
            </div>
          )}
        </div>

        {/* Caption */}
        <div>
          <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-2">Caption</p>
          <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">{post.caption}</p>
        </div>

        {/* Hashtags */}
        {post.hashtags && (
          <div>
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-2">Hashtags</p>
            <p className="text-xs text-indigo-400 leading-relaxed">{post.hashtags}</p>
          </div>
        )}

        {/* CTA */}
        {post.cta && (
          <div>
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-2">Call to Action</p>
            <div className="px-3 py-2 bg-indigo-600/10 border border-indigo-500/20 rounded-lg">
              <p className="text-xs text-indigo-300 italic">{post.cta}</p>
            </div>
          </div>
        )}

        {/* Scheduled date */}
        {ref && (
          <div>
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-2">
              {post.status === 'publicado' ? 'Publicado em' : 'Agendado para'}
            </p>
            <p className="text-xs text-slate-300 capitalize">{formatDateTime(ref)}</p>
          </div>
        )}

        {/* Meta grid */}
        <div className="bg-[#0E0E16] border border-[#1E1E2A] rounded-xl p-3 space-y-2">
          {[
            { label: 'Prioridade', value: post.prioridade.charAt(0).toUpperCase() + post.prioridade.slice(1) },
            { label: 'Criado em',  value: new Date(post.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-[11px] text-slate-600">{label}</span>
              <span className="text-[11px] text-slate-300">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer actions */}
      {(post.status === 'agendado' || post.status === 'aprovado') && (
        <div className="px-5 py-4 border-t border-[#1E1E2A] flex-shrink-0">
          <button
            onClick={() => onReschedule(post)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/25 hover:border-indigo-500/40 text-indigo-400 text-sm font-medium rounded-lg transition-colors"
          >
            <CalIcon className="w-4 h-4" />
            {post.status === 'agendado' ? 'Reagendar' : 'Agendar'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── PostChip ───────────────────────────────────────────────────────────────────

function PostChip({ post, onClick }: { post: Post; onClick: () => void }) {
  const style  = PLATFORM_STYLE[post.platform]
  const ref    = post.scheduled_at ?? post.published_at
  const isPublished = post.status === 'publicado'

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-1.5 px-1.5 py-1 rounded text-[10px] border-l-2 transition-all hover:brightness-110 text-left',
        style.bg, style.border, style.text,
        isPublished ? 'opacity-60' : 'opacity-100'
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', style.dot)} />
      <span className="font-medium tabular-nums flex-shrink-0">{ref ? formatTime(ref) : '--:--'}</span>
      <span className="truncate text-white/50">{post.caption.slice(0, 25)}</span>
    </button>
  )
}

// ── CalendarPage ───────────────────────────────────────────────────────────────

type ViewMode = 'month' | 'week'

export default function CalendarPage() {
  const activeBrand = useBrandStore((s) => s.activeBrand)
  const brandId     = activeBrand?.id ?? 0

  const { data: allPosts = [] } = usePosts(brandId)
  const schedulePost = useSchedulePost()

  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [view, setView]   = useState<ViewMode>('month')
  const [platformFilter, setPlatformFilter] = useState<SocialPlatform | 'all'>('all')
  const [statusFilter, setStatusFilter]     = useState<PostStatus | 'all'>('all')
  const [weekAnchor, setWeekAnchor]         = useState(now)
  const [selectedPost, setSelectedPost]     = useState<Post | null>(null)
  const [reschedulePost, setReschedulePost] = useState<Post | null>(null)

  // Filtered posts
  const visiblePosts = allPosts.filter((p) => {
    const hasDate = !!(p.scheduled_at ?? p.published_at)
    if (!hasDate) return false
    if (platformFilter !== 'all' && p.platform !== platformFilter) return false
    if (statusFilter   !== 'all' && p.status   !== statusFilter)   return false
    return true
  })

  // Month navigation
  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  // Week navigation
  function prevWeek() {
    const d = new Date(weekAnchor); d.setDate(d.getDate() - 7); setWeekAnchor(d)
  }
  function nextWeek() {
    const d = new Date(weekAnchor); d.setDate(d.getDate() + 7); setWeekAnchor(d)
  }

  const todayStr  = now.toDateString()
  const days      = getCalendarDays(year, month)
  const weeks     = Array.from({ length: Math.ceil(days.length / 7) }, (_, i) => days.slice(i * 7, i * 7 + 7))
  const weekDays  = getWeekDays(weekAnchor)

  function handleReschedule(post: Post) {
    setSelectedPost(null)
    setReschedulePost(post)
  }

  function handleScheduleConfirm(isoDate: string) {
    if (!reschedulePost) return
    schedulePost.mutate({ id: reschedulePost.id, payload: { agendado_para: isoDate } })
    setReschedulePost(null)
  }

  // Week view header label
  const weekStart = weekDays[0]
  const weekEnd   = weekDays[6]
  const weekLabel = weekStart.getMonth() === weekEnd.getMonth()
    ? `${MONTHS[weekStart.getMonth()]} ${weekStart.getFullYear()}`
    : `${MONTHS[weekStart.getMonth()].slice(0, 3)} – ${MONTHS[weekEnd.getMonth()].slice(0, 3)} ${weekEnd.getFullYear()}`

  return (
    <>
      {reschedulePost && (
        <ScheduleModal
          post={reschedulePost}
          onConfirm={handleScheduleConfirm}
          onClose={() => setReschedulePost(null)}
        />
      )}

      <div className="flex h-full">
        {/* Main calendar area */}
        <div className={cn('flex flex-col h-full transition-all duration-200', selectedPost ? 'flex-1 min-w-0' : 'w-full')}>
          {/* ── Toolbar ──────────────────────────────────────────────────── */}
          <div className="px-5 py-3 border-b border-[#1E1E2A] flex items-center gap-3 flex-shrink-0 flex-wrap">
            {/* Navigation */}
            <div className="flex items-center gap-1.5">
              <button onClick={view === 'month' ? prevMonth : prevWeek}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#17171F] border border-[#27273A] text-slate-400 hover:text-slate-200 transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <h2 className="text-sm font-semibold text-slate-100 min-w-[160px] text-center">
                {view === 'month' ? `${MONTHS[month]} ${year}` : weekLabel}
              </h2>
              <button onClick={view === 'month' ? nextMonth : nextWeek}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#17171F] border border-[#27273A] text-slate-400 hover:text-slate-200 transition-colors">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  setYear(now.getFullYear()); setMonth(now.getMonth()); setWeekAnchor(now)
                }}
                className="px-2.5 py-1 text-xs border border-[#27273A] rounded text-slate-500 hover:text-slate-300 hover:bg-[#17171F] transition-colors"
              >
                Hoje
              </button>
            </div>

            {/* View toggle */}
            <div className="flex items-center bg-[#17171F] border border-[#27273A] rounded-lg p-0.5">
              <button onClick={() => setView('month')}
                className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                  view === 'month' ? 'bg-[#27273A] text-slate-200' : 'text-slate-500 hover:text-slate-300')}>
                <LayoutGrid className="w-3 h-3" />
                Mês
              </button>
              <button onClick={() => setView('week')}
                className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                  view === 'week' ? 'bg-[#27273A] text-slate-200' : 'text-slate-500 hover:text-slate-300')}>
                <Rows3 className="w-3 h-3" />
                Semana
              </button>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Status filter */}
            <div className="flex items-center gap-1">
              {STATUS_FILTERS.map((f) => (
                <button key={f.key} onClick={() => setStatusFilter(f.key)}
                  className={cn('px-2 py-1 rounded text-xs font-medium transition-colors',
                    statusFilter === f.key
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-[#17171F]')}>
                  {f.label}
                </button>
              ))}
            </div>

            {/* Platform filter */}
            <div className="flex items-center gap-1">
              {PLATFORM_FILTERS.map((f) => (
                <button key={f.key} onClick={() => setPlatformFilter(f.key)}
                  className={cn('px-2 py-1 rounded text-[11px] font-medium transition-colors',
                    platformFilter === f.key
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-600 hover:text-slate-400 hover:bg-[#17171F]')}>
                  {f.label}
                </button>
              ))}
            </div>

            {/* New schedule button */}
            <button
              onClick={() => setReschedulePost(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Agendar
            </button>
          </div>

          {/* ── Calendar body ─────────────────────────────────────────────── */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">

            {view === 'month' && (
              <>
                {/* Weekday header */}
                <div className="grid grid-cols-7 border-b border-[#1E1E2A] flex-shrink-0 bg-[#0A0A0F]">
                  {WEEKDAYS_SHORT.map((d) => (
                    <div key={d} className="py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-700 text-center">
                      {d}
                    </div>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto">
                  {weeks.map((week, wi) => (
                    <div key={wi} className="grid grid-cols-7 border-b border-[#1E1E2A] last:border-0" style={{ minHeight: '120px' }}>
                      {week.map((day, di) => {
                        const dayPosts = day ? getPostsForDay(visiblePosts, day) : []
                        const isToday  = day?.toDateString() === todayStr
                        const isCurrentMonth = day?.getMonth() === month

                        return (
                          <div key={di}
                            className={cn(
                              'border-r border-[#1E1E2A] last:border-r-0 p-1.5 flex flex-col gap-1',
                              !day ? 'bg-[#08080D]' : 'hover:bg-[#17171F]/30 transition-colors'
                            )}
                          >
                            {day && (
                              <>
                                <div className="flex items-center justify-between px-0.5">
                                  <span className={cn(
                                    'text-[11px] font-medium w-5 h-5 flex items-center justify-center rounded-full',
                                    isToday ? 'bg-indigo-600 text-white' :
                                    isCurrentMonth ? 'text-slate-400' : 'text-slate-700'
                                  )}>
                                    {day.getDate()}
                                  </span>
                                  {dayPosts.length > 0 && (
                                    <span className="text-[9px] text-slate-700 font-medium">{dayPosts.length}</span>
                                  )}
                                </div>
                                <div className="space-y-0.5 overflow-hidden">
                                  {dayPosts.slice(0, 3).map((post) => (
                                    <PostChip key={post.id} post={post} onClick={() => setSelectedPost(post)} />
                                  ))}
                                  {dayPosts.length > 3 && (
                                    <button
                                      onClick={() => setSelectedPost(dayPosts[3])}
                                      className="text-[9px] text-slate-600 hover:text-slate-500 pl-1 transition-colors"
                                    >
                                      +{dayPosts.length - 3} mais
                                    </button>
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
              </>
            )}

            {view === 'week' && (
              <>
                {/* Week header */}
                <div className="grid grid-cols-7 border-b border-[#1E1E2A] flex-shrink-0 bg-[#0A0A0F]">
                  {weekDays.map((day, i) => {
                    const isToday = day.toDateString() === todayStr
                    return (
                      <div key={i} className="py-2.5 text-center border-r border-[#1E1E2A] last:border-r-0">
                        <p className={cn('text-[10px] font-semibold uppercase tracking-wider mb-0.5',
                          isToday ? 'text-indigo-400' : 'text-slate-600')}>
                          {WEEKDAYS_FULL[i].slice(0, 3)}
                        </p>
                        <span className={cn(
                          'text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full mx-auto',
                          isToday ? 'bg-indigo-600 text-white' : 'text-slate-300'
                        )}>
                          {day.getDate()}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Week body */}
                <div className="flex-1 overflow-y-auto">
                  <div className="grid grid-cols-7 h-full divide-x divide-[#1E1E2A]">
                    {weekDays.map((day, i) => {
                      const dayPosts = getPostsForDay(visiblePosts, day)
                      const isToday  = day.toDateString() === todayStr

                      return (
                        <div key={i} className={cn(
                          'p-2 space-y-1.5 min-h-[400px]',
                          isToday ? 'bg-indigo-600/5' : 'hover:bg-[#17171F]/20 transition-colors'
                        )}>
                          {dayPosts.length === 0 ? (
                            <p className="text-[10px] text-slate-800 text-center pt-4">—</p>
                          ) : (
                            dayPosts.map((post) => {
                              const style = PLATFORM_STYLE[post.platform]
                              const ref   = post.scheduled_at ?? post.published_at
                              return (
                                <button
                                  key={post.id}
                                  onClick={() => setSelectedPost(post)}
                                  className={cn(
                                    'w-full text-left p-2 rounded-lg border-l-2 space-y-1 transition-all hover:brightness-110',
                                    style.bg, style.border
                                  )}
                                >
                                  <div className="flex items-center gap-1">
                                    <span className={cn('text-[9px] font-semibold', style.text)}>
                                      {PLATFORM_LABEL[post.platform]}
                                    </span>
                                    {ref && (
                                      <span className="text-[9px] text-slate-600 ml-auto tabular-nums">
                                        {formatTime(ref)}
                                      </span>
                                    )}
                                  </div>
                                  <p className={cn('text-[10px] leading-tight line-clamp-2', style.text, 'text-white/70')}>
                                    {post.caption}
                                  </p>
                                </button>
                              )
                            })
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── Legend ────────────────────────────────────────────────────── */}
          <div className="px-5 py-2.5 border-t border-[#1E1E2A] flex items-center gap-5 flex-shrink-0 bg-[#0A0A0F]">
            {Object.entries(PLATFORM_STYLE).map(([platform, style]) => (
              <div key={platform} className="flex items-center gap-1.5">
                <span className={cn('w-1.5 h-1.5 rounded-full', style.dot)} />
                <span className="text-[10px] text-slate-700 capitalize">{platform}</span>
              </div>
            ))}
            <div className="flex-1" />
            <span className="text-[10px] text-slate-700">
              {visiblePosts.length} post{visiblePosts.length !== 1 ? 's' : ''} visíveis
            </span>
          </div>
        </div>

        {/* ── Post detail panel ──────────────────────────────────────────── */}
        {selectedPost && (
          <PostDetailPanel
            post={selectedPost}
            onClose={() => setSelectedPost(null)}
            onReschedule={handleReschedule}
          />
        )}
      </div>
    </>
  )
}
