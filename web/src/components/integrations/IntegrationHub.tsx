'use client'

import { useState, useRef } from 'react'
import { X, CheckCircle2 } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils/cn'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HubPlatform {
  id:         string
  name:       string
  icon:       React.ReactNode
  status:     'connected' | 'disconnected'
  brandColor: string
  available:  boolean   // false = coming soon, no interaction
}

// ── Geometry constants ────────────────────────────────────────────────────────

const W       = 96                         // hex cell width  (px)
const H       = 84                         // hex cell height (px)
const GAP     = 8                          // gap between cells (px)
const OFFSET  = Math.round((W + GAP) / 2) // row-2 left shift = 52 px
const OVERLAP = Math.round(H * 0.25)      // row vertical overlap = 21 px

const HEX = 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)'

// ── Helpers ───────────────────────────────────────────────────────────────────

function hexAlpha(hex: string, a: number) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${a})`
}

/** macOS-dock magnification curve */
function dockScale(hovered: number | null, idx: number): number {
  if (hovered === null) return 1
  const d = Math.abs(idx - hovered)
  if (d === 0) return 1.22
  if (d === 1) return 1.09
  if (d === 2) return 1.03
  return 1
}

// ── Brand icons ───────────────────────────────────────────────────────────────

function Ig() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" rx="6" fill="#C13584" />
      <rect x="8" y="8" width="8" height="8" rx="4" fill="none" stroke="white" strokeWidth="1.8" />
      <circle cx="16.5" cy="7.5" r="1.2" fill="white" />
    </svg>
  )
}
function Fb() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" rx="6" fill="#1877F2" />
      <path d="M13 8h1.5V5.5H13C11.3 5.5 10 6.8 10 8.5V10H8.5V12.5H10V19h2.5V12.5h2L15 10h-2.5V8.7c0-.4.3-.7 1-.7H13V8z" fill="white" />
    </svg>
  )
}
function Tt() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" rx="6" fill="#010101" />
      <path d="M17.5 8.5c-1.2 0-2.3-.7-2.8-1.7h-2v8.2c0 1-.8 1.8-1.8 1.8s-1.8-.8-1.8-1.8.8-1.8 1.8-1.8c.2 0 .3 0 .5.1V10.8c-.2 0-.3-.1-.5-.1-2.4 0-4.3 1.9-4.3 4.3s1.9 4.3 4.3 4.3 4.3-1.9 4.3-4.3V10c.7.4 1.6.7 2.6.7V8.5h-.3z" fill="white" />
    </svg>
  )
}
function Yt() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" rx="6" fill="#FF0000" />
      <path d="M19.2 9s-.2-1.1-.7-1.6c-.6-.7-1.3-.7-1.6-.7C14.6 6.5 12 6.5 12 6.5s-2.6 0-4.9.2c-.3.1-1 .1-1.6.7-.4.5-.6 1.6-.6 1.6S4.7 10.2 4.7 11.5v1.2c0 1.3.2 2.6.2 2.6s.2 1.1.7 1.6c.6.7 1.5.6 1.9.7C8.8 17.7 12 17.7 12 17.7s2.6 0 4.9-.2c.3-.1 1-.1 1.6-.7.4-.5.6-1.6.6-1.6s.2-1.3.2-2.6v-1.2C19.3 10.2 19.2 9 19.2 9zm-9.1 5.3v-4.5l4.6 2.3-4.6 2.2z" fill="white" />
    </svg>
  )
}
function Li() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" rx="6" fill="#0A66C2" />
      <path d="M6.5 8.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM5.5 10h2v9h-2v-9zm4 0h1.9v1.2c.3-.6 1-1.4 2.4-1.4 2.6 0 3 1.7 3 3.9V19h-2v-5c0-1.2 0-2.7-1.7-2.7-1.7 0-2 1.3-2 2.6V19h-2V10z" fill="white" />
    </svg>
  )
}
function Tw() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" rx="6" fill="#000000" />
      <path d="M17.3 5H19.5L14.5 10.7L20.5 19H15.6L11.6 13.9L7 19H4.8L10.2 12.9L4.5 5H9.5L13.1 9.7L17.3 5ZM16.5 17.7H17.8L8.4 6.3H7L16.5 17.7Z" fill="white" />
    </svg>
  )
}
function Pi() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" rx="6" fill="#E60023" />
      <path d="M12 4.5C7.9 4.5 4.5 7.9 4.5 12c0 3 1.8 5.5 4.4 6.6-.1-.6-.1-1.4.1-2l.9-3.7s-.2-.5-.2-1.2c0-1.1.7-2 1.5-2 .7 0 1.1.5 1.1 1.2 0 .7-.5 1.8-.7 2.8-.2.8.4 1.6 1.3 1.6 1.6 0 2.7-1.7 2.7-4.1 0-2.1-1.5-3.6-3.7-3.6-2.5 0-3.9 1.9-3.9 3.8 0 .7.3 1.5.6 1.9.1.1.1.1 0 .3-.1.3-.2.8-.2.9-.1.1-.2.2-.3.1-.9-.4-1.5-1.7-1.5-2.8 0-2.2 1.6-4.3 4.7-4.3 2.5 0 4.3 1.8 4.3 4.1 0 2.5-1.5 4.4-3.7 4.4-.7 0-1.4-.4-1.6-.8l-.4 1.6c-.1.6-.7 1.6-1.1 2.1.8.3 1.6.4 2.4.4 4.1 0 7.5-3.4 7.5-7.5S16.1 4.5 12 4.5z" fill="white" />
    </svg>
  )
}
function Wa() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" rx="6" fill="#25D366" />
      <path d="M12 4.5a7.5 7.5 0 00-6.4 11.4L4.5 19.5l3.7-1.1A7.5 7.5 0 1012 4.5zm4.3 10.4c-.2.5-1 1-1.4 1.1-.3.1-.8.1-1.3 0-.9-.3-1.7-.8-2.3-1.4-.6-.6-1.1-1.3-1.4-2-.2-.5-.1-1 .2-1.3l.3-.3c.1-.1.3-.1.3 0l.8 1.2c.1.1.1.3-.1.4l-.3.3c-.1.1-.1.2 0 .3.3.5.7.9 1.1 1.2.4.4.9.7 1.3.8.1 0 .3 0 .3-.1l.3-.3c.1-.2.3-.2.4-.1l1.2.7c.2.1.2.3.2.4l-.1.1z" fill="white" />
    </svg>
  )
}
function Th() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" rx="6" fill="#101010" />
      <path d="M16.1 10.3c-.1 0-.2-.1-.3-.1a5.6 5.6 0 00-4-.7 3.1 3.1 0 00-2.5 2.2 2.5 2.5 0 001.9 3.1c.9.2 1.8 0 2.5-.4.4-.3.6-.7.7-1.1.1-.5 0-1-.4-1.4-.4-.4-.9-.6-1.5-.5-.4.1-.8.4-.9.8 0 .3.1.6.4.8.3.2.7.2 1 .1.3-.1.5-.3.6-.5 0-.2 0-.4-.1-.4-.2-.1-.4-.2-.7-.1-.2.1-.4.3-.3.5 0 .2.1.3.2.4.2.1.3.1.5 0 .2 0 .3-.2.3-.4" stroke="white" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M8.2 7.5c.5 2.5 3.8 3 5.1 3 1.4 0 2.6-.7 3.3-1.9.6-1 .6-2.3 0-3.1-.6-.9-1.7-1.3-2.7-1.3-1.3 0-2.5.7-3.2 1.8-.4.6-.7 1.3-.8 2" stroke="white" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  )
}
function Gb() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" rx="6" fill="#F8F9FA" />
      <path d="M12 6.5c-3 0-5.5 2.5-5.5 5.5s2.5 5.5 5.5 5.5c2.7 0 5-2 5.4-4.6H12V11h7.4c.1.5.1.9.1 1 0 4.1-2.9 7-7.5 7C7 19 3.5 15.5 3.5 11S7 3.5 12 3.5c2 0 3.8.7 5.1 1.9L15.4 7C14.4 6.1 13.3 6.5 12 6.5z" fill="#4285F4" />
    </svg>
  )
}
function Sh() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" rx="6" fill="#5E8E3E" />
      <path d="M15.5 7.2c0-.1-.1-.1-.2-.2-.1 0-1-.1-1-.1L13.5 6V19l3.7-.8-1.7-11zM12.8 8l-.3-.1c-.1-.2-.2-.5-.3-.8-.3-.7-.8-1.1-1.3-1.1h-.2c-.2-.1-.3-.2-.4-.3-.3-.3-.6-.2-.7-.1C8.9 6 8.7 6.8 8.5 7.4c-.6.2-.9.3-.9.3L6.2 19l6.3 1.2 2.2-.5V8l-.1-.1l-.8.1zm-1.9-1c-.2.4-.4 1-.4 1.3v.1c-.5.2-1.1.3-1.7.5.2-.9.9-1.9 2.1-1.9zm-.5 4.9c.5.2 1 .3 1.4.3.2 0 .3 0 .5-.1l-.2 1.8c-.1 0-.2.1-.4.1s-.9-.1-1.3-.3V11.9zm-1.6.4v-.3l.9.3c-.1.4-.1.9-.1 1.2-.4-.1-.8-.3-1-.4l.2-.8z" fill="white" />
    </svg>
  )
}
function N8() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" rx="6" fill="#EA4B71" />
      <path d="M13 5l-2 6h3l-3 8 7-8h-4l2-6H13z" fill="white" />
    </svg>
  )
}
function Wh() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" rx="6" fill="#64748B" />
      <circle cx="6.5" cy="12" r="2" stroke="white" strokeWidth="1.5" fill="none" />
      <circle cx="17.5" cy="7" r="2" stroke="white" strokeWidth="1.5" fill="none" />
      <circle cx="17.5" cy="17" r="2" stroke="white" strokeWidth="1.5" fill="none" />
      <path d="M8.5 12h3.5M12 12c0-2.2 1.3-4.3 3.5-4.3M12 12c0 2.2 1.3 4.3 3.5 4.3" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  )
}

// ── Platform definitions ───────────────────────────────────────────────────────

// Providers live in Phase 1 or 2; others are coming soon
const MVP_PROVIDERS = new Set(['instagram', 'facebook', 'twitter', 'whatsapp'])

const BASE_PLATFORMS: Omit<HubPlatform, 'status'>[] = [
  // Row 1 — 5 cells
  { id: 'instagram', name: 'Instagram',       icon: <Ig />, brandColor: '#C13584', available: true  },
  { id: 'facebook',  name: 'Facebook',        icon: <Fb />, brandColor: '#1877F2', available: true  },
  { id: 'tiktok',    name: 'TikTok',          icon: <Tt />, brandColor: '#2BD9C6', available: false },
  { id: 'youtube',   name: 'YouTube',         icon: <Yt />, brandColor: '#FF0000', available: false },
  { id: 'linkedin',  name: 'LinkedIn',        icon: <Li />, brandColor: '#0A66C2', available: false },
  // Row 2 — 4 cells (offset)
  { id: 'twitter',   name: 'X',               icon: <Tw />, brandColor: '#6B7280', available: true  },
  { id: 'pinterest', name: 'Pinterest',       icon: <Pi />, brandColor: '#E60023', available: false },
  { id: 'whatsapp',  name: 'WhatsApp',        icon: <Wa />, brandColor: '#25D366', available: true  },
  { id: 'threads',   name: 'Threads',         icon: <Th />, brandColor: '#374151', available: false },
  // Row 3 — 4 cells
  { id: 'google',    name: 'Google Business', icon: <Gb />, brandColor: '#4285F4', available: false },
  { id: 'shopify',   name: 'Shopify',         icon: <Sh />, brandColor: '#5E8E3E', available: false },
  { id: 'n8n',       name: 'n8n',             icon: <N8 />, brandColor: '#EA4B71', available: false },
  { id: 'webhooks',  name: 'Webhooks',        icon: <Wh />, brandColor: '#64748B', available: false },
]

// ── HexCell ───────────────────────────────────────────────────────────────────

interface HexCellProps {
  platform:     HubPlatform
  scale:        number
  isHovered:    boolean
  onClick:      () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
}

function HexCell({ platform, scale, isHovered, onClick, onMouseEnter, onMouseLeave }: HexCellProps) {
  const ok        = platform.status === 'connected'
  const available = platform.available

  /* Coming-soon cells are non-interactive and visually muted */
  const effectiveHovered = isHovered && available
  const effectiveScale   = available ? scale : 1

  /* Brand-color ambient glow via CSS filter — works with clip-path */
  const glowColor = ok
    ? 'rgba(16,185,129,0.38)'
    : hexAlpha(platform.brandColor, 0.28)

  /* Hex surface colors */
  const borderBg = !available
    ? '#E2E8F0'                                           // muted: always slate
    : ok
    ? hexAlpha('#10B981', 0.30)                           // emerald ring
    : effectiveHovered ? '#93C5FD' : '#E2E8F0'           // blue on hover, slate idle

  const fillBg = !available
    ? '#F8FAFC'                                           // muted: near-white
    : ok
    ? '#F0FDF4'                                           // very light green
    : effectiveHovered ? '#F0F7FF' : '#FFFFFF'            // barely blue on hover, white idle

  return (
    <div
      style={{ width: W, height: H, position: 'relative' }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Dock-style label — appears above the hex on hover */}
      <div
        style={{
          position:      'absolute',
          bottom:        '100%',
          left:          '50%',
          transform:     'translateX(-50%)',
          paddingBottom: 10,
          zIndex:        50,
          pointerEvents: 'none',
          opacity:       isHovered ? 1 : 0,
          transition:    'opacity 130ms ease',
          whiteSpace:    'nowrap',
        }}
        aria-hidden="true"
      >
        <span style={{
          display:       'block',
          fontSize:      10,
          fontWeight:    500,
          color:         '#475569',
          background:    '#FFFFFF',
          border:        '1px solid rgba(226,232,240,0.95)',
          padding:       '3px 8px',
          borderRadius:  6,
          boxShadow:     '0 2px 8px rgba(0,0,0,0.07)',
          letterSpacing: '-0.01em',
          lineHeight:    1.6,
        }}>
          {platform.name}
          {!available && (
            <span style={{ marginLeft: 4, color: '#94A3B8', fontWeight: 400 }}>· em breve</span>
          )}
        </span>
      </div>

      {/* Clickable button — layout box stays fixed; only the visual scales */}
      <button
        onClick={available ? onClick : undefined}
        style={{
          position:   'absolute',
          inset:      0,
          outline:    'none',
          background: 'none',
          border:     'none',
          cursor:     available ? 'pointer' : 'default',
          padding:    0,
          opacity:    available ? 1 : 0.45,
        }}
        aria-label={available ? platform.name : `${platform.name} — em breve`}
        aria-disabled={!available || undefined}
      >
        {/* Scaling + glow wrapper */}
        <span
          style={{
            position:       'absolute',
            inset:          0,
            display:        'block',
            transform:      `scale(${effectiveScale})`,
            transformOrigin:'bottom center',
            transition:     'transform 300ms cubic-bezier(0.34,1.4,0.64,1), filter 220ms ease',
            filter:         effectiveHovered ? `drop-shadow(0 6px 18px ${glowColor})` : 'none',
            zIndex:         effectiveHovered ? 20 : 1,
          }}
        >
          {/* ── Outer hex: border ring ── */}
          <span
            style={{
              position:        'absolute',
              inset:           0,
              display:         'block',
              clipPath:        HEX,
              backgroundColor: borderBg,
              transition:      'background-color 180ms ease',
            }}
          />

          {/* ── Inner hex: fill surface ── */}
          <span
            style={{
              position:        'absolute',
              top:             '2.5px',
              right:           '2.5px',
              bottom:          '2.5px',
              left:            '2.5px',
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              clipPath:        HEX,
              backgroundColor: fillBg,
              transition:      'background-color 180ms ease',
            }}
          >
            {/* Icon — magnifies on hover */}
            <span
              style={{
                display:    'flex',
                alignItems: 'center',
                transform:  effectiveHovered ? 'scale(1.14)' : 'scale(1)',
                transition: 'transform 300ms cubic-bezier(0.34,1.4,0.64,1)',
              }}
            >
              {platform.icon}
            </span>
          </span>

          {/* ── Connected status dot ── */}
          {ok && (
            <span
              style={{
                position:        'absolute',
                bottom:          15,
                right:           18,
                width:           9,
                height:          9,
                borderRadius:    '50%',
                backgroundColor: '#10B981',
                /* double ring: white + faint green halo */
                boxShadow:       '0 0 0 2px #FFFFFF, 0 0 0 3.5px rgba(16,185,129,0.22)',
                zIndex:          10,
              }}
              aria-hidden="true"
            />
          )}
        </span>
      </button>
    </div>
  )
}

// ── HexRow ────────────────────────────────────────────────────────────────────

interface HexRowProps {
  platforms:      HubPlatform[]
  onSelect:       (p: HubPlatform) => void
  offset?:        boolean
  marginTop?:     number
  rowZIndex:      number
  onBecomeActive: () => void
  onBecomeIdle:   () => void
}

function HexRow({
  platforms, onSelect, offset, marginTop, rowZIndex, onBecomeActive, onBecomeIdle,
}: HexRowProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const leaveTimer = useRef<ReturnType<typeof setTimeout>>()

  function enter(idx: number) {
    clearTimeout(leaveTimer.current)
    setHovered(idx)
    onBecomeActive()
  }

  function leave() {
    leaveTimer.current = setTimeout(() => {
      setHovered(null)
      onBecomeIdle()
    }, 80)
  }

  return (
    <div
      style={{
        display:    'flex',
        alignItems: 'flex-end',      /* upward growth = dock behavior */
        gap:        GAP,
        marginTop:  marginTop ?? 0,
        marginLeft: offset ? OFFSET : 0,
        position:   'relative',
        zIndex:     rowZIndex,
      }}
    >
      {platforms.map((p, i) => (
        <HexCell
          key={p.id}
          platform={p}
          scale={dockScale(hovered, i)}
          isHovered={hovered === i}
          onClick={() => onSelect(p)}
          onMouseEnter={() => enter(i)}
          onMouseLeave={leave}
        />
      ))}
    </div>
  )
}

// ── ConnectModal ──────────────────────────────────────────────────────────────

interface ModalProps {
  platform: HubPlatform
  onClose:  () => void
}

function ConnectModal({ platform, onClose }: ModalProps) {
  const ok = platform.status === 'connected'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.14 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.42)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{    opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="bg-white rounded-2xl w-full max-w-[360px] overflow-hidden"
        style={{ boxShadow: '0 8px 48px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.08)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0">
              {platform.icon}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 tracking-tight">
                {platform.name}
              </p>
              <p className={cn(
                'flex items-center gap-1.5 text-[11px] mt-0.5',
                ok ? 'text-emerald-600' : 'text-slate-400',
              )}>
                <span className={cn(
                  'w-1.5 h-1.5 rounded-full flex-shrink-0',
                  ok ? 'bg-emerald-500' : 'bg-slate-300',
                )} />
                {ok ? 'Conectado' : 'Não conectado'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          {!platform.available ? (
            <div className="space-y-3">
              <div className="px-3 py-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <p className="text-sm font-medium text-slate-500">Em breve</p>
                <p className="text-[12px] text-slate-400 mt-1">
                  {platform.name} estará disponível em uma próxima versão.
                </p>
              </div>
              <button onClick={onClose} className="w-full btn-secondary text-xs h-9">
                Fechar
              </button>
            </div>
          ) : ok ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 px-3 py-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span className="text-sm font-medium text-emerald-700">Integração ativa</span>
              </div>
              <p className="text-[12px] text-slate-400 leading-relaxed">
                Para desconectar ou reconfigurar, use a seção de Providers abaixo.
              </p>
              <button onClick={onClose} className="w-full btn-secondary text-xs h-9">
                Fechar
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-500 leading-relaxed">
                Conecte {platform.name} para publicar e automatizar sua operação de marketing.
                Use o botão abaixo na seção de Providers para iniciar o fluxo OAuth.
              </p>
              <button onClick={onClose} className="w-full btn-primary h-9 text-sm">
                Ver Providers
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── IntegrationHub ─────────────────────────────────────────────────────────────

interface IntegrationHubProps {
  connectedIds?: string[]
}

export function IntegrationHub({ connectedIds = [] }: IntegrationHubProps) {
  const [selected,  setSelected]  = useState<HubPlatform | null>(null)
  const [activeRow, setActiveRow] = useState<number | null>(null)

  const platforms: HubPlatform[] = BASE_PLATFORMS.map((p) => ({
    ...p,
    status: connectedIds.includes(p.id) ? 'connected' : 'disconnected',
    // available is already set in BASE_PLATFORMS
  }))

  /* 3-row honeycomb: 5 / 4 (offset) / 4 */
  const rows = [
    platforms.slice(0, 5),
    platforms.slice(5, 9),
    platforms.slice(9, 13),
  ]

  const connectedCount = platforms.filter((p) => p.status === 'connected').length

  return (
    <>
      {/* ── Panel ──────────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden mb-6"
        style={{
          background: '#FFFFFF',
          border:     '1px solid rgba(226,232,240,0.85)',
          boxShadow:  '0 1px 3px rgba(0,0,0,0.04), 0 6px 28px rgba(0,0,0,0.05)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-7 pt-6 pb-5 border-b border-slate-100">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900 tracking-tight leading-snug">
              Conectar Plataformas
            </h2>
            <p className="text-[12px] text-slate-400 mt-1 leading-relaxed">
              Integre suas redes e automatize sua operação
            </p>
          </div>

          {connectedCount > 0 && (
            <div
              className="flex items-center gap-1.5 mt-0.5 flex-shrink-0"
              style={{
                padding:    '4px 11px',
                borderRadius: 999,
                background: 'rgba(16,185,129,0.08)',
                border:     '1px solid rgba(16,185,129,0.20)',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0"
                aria-hidden="true"
              />
              <span className="text-[11px] font-semibold text-emerald-600 tracking-tight">
                {connectedCount} conectada{connectedCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Honeycomb grid — extra padding-top creates tooltip headroom */}
        <div
          className="flex justify-center px-8"
          style={{
            paddingTop:    52,
            paddingBottom: 36,
            backgroundColor:  '#FAFBFC',
            backgroundImage:  'radial-gradient(rgba(148,163,184,0.11) 1px, transparent 1px)',
            backgroundSize:   '22px 22px',
          }}
        >
          {/*
           * position: relative creates a stacking context so each HexRow's
           * zIndex is evaluated within this container only.
           */}
          <div style={{ position: 'relative' }}>
            {rows.map((row, ri) => (
              <HexRow
                key={ri}
                platforms={row}
                onSelect={setSelected}
                offset={ri === 1}
                marginTop={ri > 0 ? -OVERLAP : 0}
                /*
                 * Idle z-index: ri+1 so row 2 (z=3) naturally sits in front
                 * of row 1 (z=2) in the honeycomb overlap area.
                 * Active z-index: 30 — pops to top so the magnified hex
                 * renders above rows rendered later in the DOM.
                 */
                rowZIndex={activeRow === ri ? 30 : ri + 1}
                onBecomeActive={() => setActiveRow(ri)}
                onBecomeIdle={() => setActiveRow((prev) => (prev === ri ? null : prev))}
              />
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-5 px-7 py-4 border-t border-slate-100">
          <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" aria-hidden="true" />
            Conectado
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0" aria-hidden="true" />
            Disponível
          </span>
          <span className="text-slate-200 select-none" aria-hidden="true">·</span>
          <span className="text-[11px] text-slate-400">Clique para conectar</span>
        </div>
      </div>

      {/* Modal (Framer Motion AnimatePresence for enter/exit) */}
      <AnimatePresence>
        {selected && (
          <ConnectModal
            platform={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
