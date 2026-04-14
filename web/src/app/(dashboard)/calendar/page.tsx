'use client'

import { useState, useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import {
  ChevronLeft, ChevronRight, X,
  Calendar as CalIcon, Clock, LayoutGrid, Rows3,
  ChevronDown, Check,
} from 'lucide-react'
import type { Post, Brand, SocialPlatform, PostStatus } from '@/types'
import { useBrandStore }   from '@/store/brandStore'
import { useBrands }       from '@/hooks/useBrands'
import { useSchedulePost } from '@/hooks/usePosts'
import { postService }     from '@/services/postService'
import { queryKeys }       from '@/lib/api/queryClient'
import { cn } from '@/lib/utils/cn'

// ── Constants ──────────────────────────────────────────────────────────────────

const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]
const WEEKDAYS_SHORT = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom']
const WEEKDAYS_FULL  = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo']

const PLATFORM_STYLE: Record<SocialPlatform, {
  bg: string; border: string; text: string; dot: string; badge: string
}> = {
  instagram: { bg: 'bg-violet-950/60', border: 'border-l-violet-500', text: 'text-violet-300', dot: 'bg-violet-500', badge: 'bg-violet-600/20 text-violet-300 border-violet-500/30' },
  linkedin:  { bg: 'bg-blue-950/60',   border: 'border-l-blue-500',   text: 'text-blue-300',   dot: 'bg-blue-500',   badge: 'bg-blue-600/20 text-blue-300 border-blue-500/30' },
  tiktok:    { bg: 'bg-pink-950/60',   border: 'border-l-pink-500',   text: 'text-pink-300',   dot: 'bg-pink-500',   badge: 'bg-pink-600/20 text-pink-300 border-pink-500/30' },
  twitter:   { bg: 'bg-sky-950/60',    border: 'border-l-sky-500',    text: 'text-sky-300',    dot: 'bg-sky-500',    badge: 'bg-sky-600/20 text-sky-300 border-sky-500/30' },
  facebook:  { bg: 'bg-indigo-950/60', border: 'border-l-indigo-500', text: 'text-indigo-300', dot: 'bg-indigo-500', badge: 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30' },
}

const PLATFORM_LABEL: Record<SocialPlatform, string> = {
  instagram: 'Instagram', linkedin: 'LinkedIn', tiktok: 'TikTok',
  twitter: 'Twitter', facebook: 'Facebook',
}

const STATUS_CFG: Record<PostStatus, { label: string; dot: string; text: string; ring: string }> = {
  rascunho:  { label: 'Rascunho',  dot: 'bg-slate-500',   text: 'text-slate-400',   ring: 'ring-slate-500/30' },
  aprovado:  { label: 'Aprovado',  dot: 'bg-amber-400',   text: 'text-amber-400',   ring: 'ring-amber-400/30' },
  agendado:  { label: 'Agendado',  dot: 'bg-blue-400',    text: 'text-blue-400',    ring: 'ring-blue-400/30' },
  publicado: { label: 'Publicado', dot: 'bg-emerald-400', text: 'text-emerald-400', ring: 'ring-emerald-400/30' },
  arquivado: { label: 'Arquivado', dot: 'bg-slate-600',   text: 'text-slate-600',   ring: 'ring-slate-600/30' },
}

const FORMAT_LABEL: Record<string, string> = {
  carrossel: 'Carrossel', reels: 'Reels', imagem_unica: 'Imagem',
  stories: 'Stories', texto: 'Texto', video: 'Vídeo', live: 'Live',
}

const STATUS_FILTERS: { key: PostStatus | 'all'; label: string }[] = [
  { key: 'all',       label: 'Todos' },
  { key: 'rascunho',  label: 'Rascunho' },
  { key: 'aprovado',  label: 'Aprovado' },
  { key: 'agendado',  label: 'Agendado' },
  { key: 'publicado', label: 'Publicado' },
]

const PLATFORM_FILTERS: { key: SocialPlatform | 'all'; label: string }[] = [
  { key: 'all',       label: 'Canal' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'linkedin',  label: 'LinkedIn' },
  { key: 'tiktok',    label: 'TikTok' },
  { key: 'twitter',   label: 'Twitter' },
  { key: 'facebook',  label: 'Facebook' },
]

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Date used to place a post on the calendar grid */
function getPostDate(post: Post): Date | null {
  const ref = post.scheduled_at ?? post.published_at ?? post.created_at
  if (!ref) return null
  return new Date(ref)
}

/** Whether the post's date is "real" (scheduled/published) or just created_at fallback */
function hasFixedDate(post: Post): boolean {
  return !!(post.scheduled_at ?? post.published_at)
}

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

function getWeekDays(anchor: Date): Date[] {
  const day = anchor.getDay()
  const monday = new Date(anchor)
  monday.setDate(anchor.getDate() - (day === 0 ? 6 : day - 1))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i); return d
  })
}

function getPostsForDay(posts: Post[], date: Date): Post[] {
  return posts
    .filter((p) => {
      const d = getPostDate(p)
      if (!d) return false
      return (
        d.getFullYear() === date.getFullYear() &&
        d.getMonth()    === date.getMonth() &&
        d.getDate()     === date.getDate()
      )
    })
    .sort((a, b) => {
      const ta = getPostDate(a)?.getTime() ?? 0
      const tb = getPostDate(b)?.getTime() ?? 0
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

// ── BrandDropdown ──────────────────────────────────────────────────────────────

interface BrandDropdownProps {
  brands:         Brand[]
  selectedIds:    number[]
  onToggle:       (id: number) => void
  onSelectAll:    () => void
}

function BrandDropdown({ brands, selectedIds, onToggle, onSelectAll }: BrandDropdownProps) {
  const [open, setOpen] = useState(false)
  const allSelected = selectedIds.length === brands.length

  const label = allSelected
    ? 'Todas as marcas'
    : selectedIds.length === 1
      ? brands.find((b) => b.id === selectedIds[0])?.name ?? '1 marca'
      : `${selectedIds.length} marcas`

  if (brands.length <= 1) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors',
          open
            ? 'bg-[#27273A] border-[#3F3F56] text-slate-200'
            : 'bg-[#17171F] border-[#27273A] text-slate-400 hover:text-slate-200 hover:border-[#3F3F56]'
        )}
      >
        <span className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />
        {label}
        <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1.5 z-40 w-52 bg-[#111118] border border-[#27273A] rounded-xl shadow-2xl overflow-hidden">
            <button
              onClick={() => { onSelectAll(); setOpen(false) }}
              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[#17171F] transition-colors border-b border-[#1E1E2A]"
            >
              <span className="text-xs font-medium text-slate-300">Todas as marcas</span>
              {allSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
            </button>
            {brands.map((brand) => (
              <button
                key={brand.id}
                onClick={() => onToggle(brand.id)}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[#17171F] transition-colors"
              >
                <span className="text-xs text-slate-400">{brand.name}</span>
                {selectedIds.includes(brand.id) && <Check className="w-3.5 h-3.5 text-indigo-400" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── ScheduleModal ──────────────────────────────────────────────────────────────

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
  brandName?: string
  onClose: () => void
  onReschedule: (post: Post) => void
}

function PostDetailPanel({ post, brandName, onClose, onReschedule }: PostDetailPanelProps) {
  const style     = PLATFORM_STYLE[post.platform]
  const ref       = post.scheduled_at ?? post.published_at
  const statusCfg = STATUS_CFG[post.status]
  const fixed     = hasFixedDate(post)

  return (
    <div className="w-[300px] border-l border-[#1E1E2A] flex flex-col flex-shrink-0 bg-[#0C0C11]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E1E2A]">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn('w-2 h-2 rounded-full flex-shrink-0', style.dot)} />
          <span className={cn('text-xs font-semibold truncate', style.text)}>{PLATFORM_LABEL[post.platform]}</span>
          <span className="text-xs text-slate-600">·</span>
          <span className="text-xs text-slate-500 truncate">{FORMAT_LABEL[post.formato]}</span>
        </div>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md text-slate-600 hover:text-slate-400 hover:bg-[#17171F] transition-colors flex-shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Status + time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className={cn('w-1.5 h-1.5 rounded-full', statusCfg.dot)} />
            <span className={cn('text-xs font-medium', statusCfg.text)}>{statusCfg.label}</span>
            {!fixed && (
              <span className="text-[10px] text-slate-600 italic ml-1">(sem data)</span>
            )}
          </div>
          {ref && (
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Clock className="w-3 h-3" />
              <span>{formatTime(ref)}</span>
            </div>
          )}
        </div>

        {/* Brand */}
        {brandName && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Marca</span>
            <span className="text-[11px] text-slate-400 ml-auto">{brandName}</span>
          </div>
        )}

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

        {/* Date */}
        {ref && (
          <div>
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-2">
              {post.status === 'publicado' ? 'Publicado em' : 'Agendado para'}
            </p>
            <p className="text-xs text-slate-300 capitalize">{formatDateTime(ref)}</p>
          </div>
        )}

        {/* Meta */}
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

      {/* Footer action */}
      {(post.status === 'agendado' || post.status === 'aprovado' || post.status === 'rascunho') && (
        <div className="px-5 py-4 border-t border-[#1E1E2A] flex-shrink-0">
          <button
            onClick={() => onReschedule(post)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/25 hover:border-indigo-500/40 text-indigo-400 text-sm font-medium rounded-lg transition-colors"
          >
            <CalIcon className="w-4 h-4" />
            {post.scheduled_at ? 'Reagendar' : 'Agendar'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── PostChip (month view) ──────────────────────────────────────────────────────

function PostChip({ post, onClick }: { post: Post; onClick: () => void }) {
  const style  = PLATFORM_STYLE[post.platform]
  const status = STATUS_CFG[post.status]
  const ref    = post.scheduled_at ?? post.published_at
  const fixed  = hasFixedDate(post)

  return (
    <button
      onClick={onClick}
      title={post.caption}
      className={cn(
        'w-full flex items-center gap-1.5 px-1.5 py-1 rounded text-[10px] border-l-2 transition-all hover:brightness-110 text-left',
        style.bg, style.border,
        !fixed && 'opacity-50 border-dashed'
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', status.dot)} />
      <span className={cn('font-medium tabular-nums flex-shrink-0 w-8', style.text)}>
        {ref ? formatTime(ref) : '—:—'}
      </span>
      <span className="truncate text-white/55">{post.caption.slice(0, 22)}</span>
    </button>
  )
}

// ── CalendarPage ───────────────────────────────────────────────────────────────

type ViewMode = 'month' | 'week'

export default function CalendarPage() {
  const activeBrand             = useBrandStore((s) => s.activeBrand)
  const { data: allBrands = [] } = useBrands()
  const schedulePost             = useSchedulePost()

  // Brand selection: default to activeBrand if set, otherwise all
  const [selectedBrandIds, setSelectedBrandIds] = useState<number[]>(() =>
    activeBrand ? [activeBrand.id] : allBrands.map((b) => b.id)
  )

  // Keep selectedBrandIds in sync when allBrands loads (cold start)
  const effectiveBrandIds = useMemo(() => {
    if (selectedBrandIds.length > 0) return selectedBrandIds
    return allBrands.map((b) => b.id)
  }, [selectedBrandIds, allBrands])

  // Parallel post queries per brand
  const postQueries = useQueries({
    queries: effectiveBrandIds.map((brandId) => ({
      queryKey: queryKeys.posts(brandId),
      queryFn:  () => postService.listByBrand(brandId),
      staleTime: 30_000,
    })),
  })
  const allPosts: Post[] = postQueries.flatMap((q) => q.data ?? [])

  // Build a brandId→name map for the detail panel
  const brandMap = useMemo<Record<number, string>>(() =>
    Object.fromEntries(allBrands.map((b) => [b.id, b.name])), [allBrands]
  )

  // Date / view state
  const now = new Date()
  const [year, setYear]         = useState(now.getFullYear())
  const [month, setMonth]       = useState(now.getMonth())
  const [view, setView]         = useState<ViewMode>('month')
  const [weekAnchor, setWeekAnchor] = useState(now)

  // Filter state
  const [platformFilter, setPlatformFilter] = useState<SocialPlatform | 'all'>('all')
  const [statusFilter,   setStatusFilter]   = useState<PostStatus | 'all'>('all')

  // Detail / reschedule
  const [selectedPost,   setSelectedPost]   = useState<Post | null>(null)
  const [reschedulePost, setReschedulePost] = useState<Post | null>(null)

  // Apply filters
  const visiblePosts = useMemo(() => allPosts.filter((p) => {
    if (platformFilter !== 'all' && p.platform !== platformFilter) return false
    if (statusFilter   !== 'all' && p.status   !== statusFilter)   return false
    return true
  }), [allPosts, platformFilter, statusFilter])

  // Status counts (for status bar)
  const statusCounts = useMemo(() => ({
    rascunho:  allPosts.filter((p) => p.status === 'rascunho').length,
    aprovado:  allPosts.filter((p) => p.status === 'aprovado').length,
    agendado:  allPosts.filter((p) => p.status === 'agendado').length,
    publicado: allPosts.filter((p) => p.status === 'publicado').length,
  }), [allPosts])

  // Calendar data
  const days    = getCalendarDays(year, month)
  const weeks   = Array.from({ length: Math.ceil(days.length / 7) }, (_, i) => days.slice(i * 7, i * 7 + 7))
  const weekDays = getWeekDays(weekAnchor)

  // Month nav
  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) } else { setMonth(m => m - 1) }
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) } else { setMonth(m => m + 1) }
  }

  // Week nav
  function prevWeek() { const d = new Date(weekAnchor); d.setDate(d.getDate() - 7); setWeekAnchor(d) }
  function nextWeek() { const d = new Date(weekAnchor); d.setDate(d.getDate() + 7); setWeekAnchor(d) }

  function goToday() { setYear(now.getFullYear()); setMonth(now.getMonth()); setWeekAnchor(now) }

  function handleReschedule(post: Post) { setSelectedPost(null); setReschedulePost(post) }

  function handleScheduleConfirm(isoDate: string) {
    if (!reschedulePost) return
    schedulePost.mutate({ id: reschedulePost.id, payload: { scheduled_at: isoDate } })
    setReschedulePost(null)
  }

  // Brand dropdown helpers
  function toggleBrand(id: number) {
    setSelectedBrandIds((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((x) => x !== id) : prev) : [...prev, id]
    )
  }
  function selectAllBrands() { setSelectedBrandIds(allBrands.map((b) => b.id)) }

  const todayStr = now.toDateString()

  const weekLabel = (() => {
    const ws = weekDays[0]; const we = weekDays[6]
    return ws.getMonth() === we.getMonth()
      ? `${MONTHS[ws.getMonth()]} ${ws.getFullYear()}`
      : `${MONTHS[ws.getMonth()].slice(0, 3)} – ${MONTHS[we.getMonth()].slice(0, 3)} ${we.getFullYear()}`
  })()

  // Loading state
  const isLoading = postQueries.some((q) => q.isLoading)

  return (
    <>
      {reschedulePost && (
        <ScheduleModal
          post={reschedulePost}
          onConfirm={handleScheduleConfirm}
          onClose={() => setReschedulePost(null)}
        />
      )}

      <div className="flex h-full overflow-hidden">

        {/* ── Main calendar area ───────────────────────────────────────────── */}
        <div className={cn('flex flex-col h-full transition-all duration-200 min-w-0', selectedPost ? 'flex-1' : 'w-full')}>

          {/* ── Status bar ─────────────────────────────────────────────────── */}
          <div className="px-5 py-2 border-b border-[#1E1E2A] bg-[#090910] flex items-center gap-4 flex-shrink-0">
            {(Object.entries(statusCounts) as [PostStatus, number][]).map(([s, count]) => (
              <button
                key={s}
                onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors border',
                  statusFilter === s
                    ? cn('border-transparent', STATUS_CFG[s].text, 'bg-white/5')
                    : 'border-transparent text-slate-600 hover:text-slate-400'
                )}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_CFG[s].dot)} />
                {STATUS_CFG[s].label}
                <span className="tabular-nums">{count}</span>
              </button>
            ))}
            <div className="flex-1" />
            <span className="text-[10px] text-slate-700">
              {visiblePosts.length} post{visiblePosts.length !== 1 ? 's' : ''} visíveis
            </span>
          </div>

          {/* ── Toolbar ────────────────────────────────────────────────────── */}
          <div className="px-5 py-2.5 border-b border-[#1E1E2A] flex items-center gap-2.5 flex-shrink-0 flex-wrap">

            {/* Navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={view === 'month' ? prevMonth : prevWeek}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#17171F] border border-[#27273A] text-slate-500 hover:text-slate-200 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <h2 className="text-sm font-semibold text-slate-100 min-w-[152px] text-center">
                {view === 'month' ? `${MONTHS[month]} ${year}` : weekLabel}
              </h2>
              <button
                onClick={view === 'month' ? nextMonth : nextWeek}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#17171F] border border-[#27273A] text-slate-500 hover:text-slate-200 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={goToday}
                className="px-2.5 py-1 text-xs border border-[#27273A] rounded text-slate-500 hover:text-slate-300 hover:bg-[#17171F] transition-colors ml-1"
              >
                Hoje
              </button>
            </div>

            {/* View toggle */}
            <div className="flex items-center bg-[#17171F] border border-[#27273A] rounded-lg p-0.5">
              {(['month', 'week'] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                    view === v ? 'bg-[#27273A] text-slate-200' : 'text-slate-500 hover:text-slate-300'
                  )}
                >
                  {v === 'month' ? <LayoutGrid className="w-3 h-3" /> : <Rows3 className="w-3 h-3" />}
                  {v === 'month' ? 'Mês' : 'Semana'}
                </button>
              ))}
            </div>

            {/* Brand dropdown */}
            <BrandDropdown
              brands={allBrands}
              selectedIds={effectiveBrandIds}
              onToggle={toggleBrand}
              onSelectAll={selectAllBrands}
            />

            <div className="flex-1" />

            {/* Platform filter */}
            <div className="flex items-center gap-1 flex-wrap">
              {PLATFORM_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setPlatformFilter(f.key)}
                  className={cn(
                    'px-2 py-1 rounded text-[11px] font-medium transition-colors',
                    platformFilter === f.key
                      ? 'bg-[#27273A] text-slate-200'
                      : 'text-slate-600 hover:text-slate-400 hover:bg-[#17171F]'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Calendar body ─────────────────────────────────────────────── */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">

            {/* Loading overlay */}
            {isLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0A0A0F]/50">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  Carregando...
                </div>
              </div>
            )}

            {/* ── Month view ───────────────────────────────────────────────── */}
            {view === 'month' && (
              <>
                <div className="grid grid-cols-7 border-b border-[#1E1E2A] flex-shrink-0 bg-[#090910]">
                  {WEEKDAYS_SHORT.map((d) => (
                    <div key={d} className="py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-700 text-center">
                      {d}
                    </div>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto">
                  {weeks.map((week, wi) => (
                    <div
                      key={wi}
                      className="grid grid-cols-7 border-b border-[#1E1E2A] last:border-0"
                      style={{ minHeight: '116px' }}
                    >
                      {week.map((day, di) => {
                        const dayPosts   = day ? getPostsForDay(visiblePosts, day) : []
                        const isToday    = day?.toDateString() === todayStr
                        const isCurMonth = day?.getMonth() === month

                        return (
                          <div
                            key={di}
                            className={cn(
                              'border-r border-[#1E1E2A] last:border-r-0 p-1.5 flex flex-col gap-1 min-w-0',
                              !day ? 'bg-[#07070C]' : isToday ? 'bg-indigo-600/5' : 'hover:bg-[#17171F]/25 transition-colors'
                            )}
                          >
                            {day && (
                              <>
                                <div className="flex items-center justify-between px-0.5 mb-0.5">
                                  <span className={cn(
                                    'text-[11px] font-medium w-5 h-5 flex items-center justify-center rounded-full',
                                    isToday
                                      ? 'bg-indigo-600 text-white font-bold'
                                      : isCurMonth ? 'text-slate-400' : 'text-slate-700'
                                  )}>
                                    {day.getDate()}
                                  </span>
                                  {dayPosts.length > 0 && (
                                    <span className="text-[9px] text-slate-700 tabular-nums">{dayPosts.length}</span>
                                  )}
                                </div>
                                <div className="space-y-0.5 overflow-hidden">
                                  {dayPosts.slice(0, 3).map((post) => (
                                    <PostChip
                                      key={post.id}
                                      post={post}
                                      onClick={() => setSelectedPost(post)}
                                    />
                                  ))}
                                  {dayPosts.length > 3 && (
                                    <button
                                      onClick={() => setSelectedPost(dayPosts[3])}
                                      className="text-[9px] text-slate-600 hover:text-indigo-400 pl-1.5 transition-colors"
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

            {/* ── Week view ────────────────────────────────────────────────── */}
            {view === 'week' && (
              <>
                <div className="grid grid-cols-7 border-b border-[#1E1E2A] flex-shrink-0 bg-[#090910]">
                  {weekDays.map((day, i) => {
                    const isToday = day.toDateString() === todayStr
                    return (
                      <div key={i} className="py-2.5 text-center border-r border-[#1E1E2A] last:border-r-0">
                        <p className={cn(
                          'text-[10px] font-semibold uppercase tracking-wider mb-0.5',
                          isToday ? 'text-indigo-400' : 'text-slate-600'
                        )}>
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

                <div className="flex-1 overflow-y-auto">
                  <div className="grid grid-cols-7 divide-x divide-[#1E1E2A]" style={{ minHeight: '100%' }}>
                    {weekDays.map((day, i) => {
                      const dayPosts = getPostsForDay(visiblePosts, day)
                      const isToday  = day.toDateString() === todayStr

                      return (
                        <div
                          key={i}
                          className={cn(
                            'p-2 space-y-1.5 min-h-[480px]',
                            isToday ? 'bg-indigo-600/5' : 'hover:bg-[#17171F]/15 transition-colors'
                          )}
                        >
                          {dayPosts.length === 0 ? (
                            <p className="text-[10px] text-slate-800 text-center pt-6">—</p>
                          ) : (
                            dayPosts.map((post) => {
                              const style  = PLATFORM_STYLE[post.platform]
                              const status = STATUS_CFG[post.status]
                              const ref    = post.scheduled_at ?? post.published_at
                              const fixed  = hasFixedDate(post)

                              return (
                                <button
                                  key={post.id}
                                  onClick={() => setSelectedPost(post)}
                                  className={cn(
                                    'w-full text-left p-2 rounded-lg border-l-2 space-y-1.5 transition-all hover:brightness-110',
                                    style.bg, style.border,
                                    !fixed && 'opacity-55 border-dashed'
                                  )}
                                >
                                  <div className="flex items-center gap-1">
                                    <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', status.dot)} />
                                    <span className={cn('text-[9px] font-semibold', style.text)}>
                                      {PLATFORM_LABEL[post.platform]}
                                    </span>
                                    {ref && (
                                      <span className="text-[9px] text-slate-600 ml-auto tabular-nums">
                                        {formatTime(ref)}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] leading-tight line-clamp-3 text-white/65">
                                    {post.caption}
                                  </p>
                                  <div className={cn('text-[9px] font-medium', status.text)}>
                                    {status.label}
                                  </div>
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

          {/* ── Legend ─────────────────────────────────────────────────────── */}
          <div className="px-5 py-2 border-t border-[#1E1E2A] flex items-center gap-4 flex-shrink-0 bg-[#090910]">
            <div className="flex items-center gap-3.5">
              {Object.entries(PLATFORM_STYLE).map(([platform, s]) => (
                <div key={platform} className="flex items-center gap-1.5">
                  <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />
                  <span className="text-[10px] text-slate-700">{PLATFORM_LABEL[platform as SocialPlatform]}</span>
                </div>
              ))}
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2 text-[10px] text-slate-700">
              <span className="flex items-center gap-1">
                <span className="w-3 border-t-2 border-dashed border-slate-600 inline-block" />
                sem data agendada
              </span>
            </div>
          </div>
        </div>

        {/* ── Post detail panel ──────────────────────────────────────────── */}
        {selectedPost && (
          <PostDetailPanel
            post={selectedPost}
            brandName={brandMap[selectedPost.brand_id]}
            onClose={() => setSelectedPost(null)}
            onReschedule={handleReschedule}
          />
        )}
      </div>
    </>
  )
}
