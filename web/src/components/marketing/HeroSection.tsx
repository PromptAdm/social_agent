'use client'

import Link from 'next/link'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { useRef } from 'react'
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
} from 'framer-motion'

/* ── Spring presets ──────────────────────────────────────────────────── */
const DRIFT  = { stiffness: 22, damping: 50, restDelta: 0.001 } as const
const FOLLOW = { stiffness: 28, damping: 60, restDelta: 0.001 } as const

const EASE_OUT = [0.16, 1, 0.3, 1] as const

const fadeUp = {
  hidden:  { opacity: 0, y: 14 },
  visible: (d: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: EASE_OUT, delay: d },
  }),
}

/* ── Gradient "z" brand mark ─────────────────────────────────────────── */
function NezoraMark({ className }: { className?: string }) {
  return (
    <span className={className}>
      Ne
      <span
        style={{
          background: 'linear-gradient(135deg, #7C3AED 0%, #3B82F6 52%, #10B981 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        z
      </span>
      ora
    </span>
  )
}

/* ── HeroSection ─────────────────────────────────────────────────────── */
export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null)

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })

  /*
   * Keep Y as pixel-independent percentage of the motion.div itself.
   * scale(1.12) gives the video ~12% bleed on every edge so a 10%
   * downward translateY never reveals empty section background.
   */
  const rawVideoY = useTransform(scrollYProgress, [0, 1], ['0%', '10%'])
  const videoY    = useSpring(rawVideoY, DRIFT)

  const rawTextY  = useTransform(scrollYProgress, [0, 1],    ['0%', '-4%'])
  const rawTextOp = useTransform(scrollYProgress, [0, 0.65], [1, 0])
  const textY     = useSpring(rawTextY,  FOLLOW)
  const textOp    = useSpring(rawTextOp, FOLLOW)

  return (
    /*
     * z-stack  ─────────────────────────────────────────────────────
     *  z-[1]   video layer
     *  z-[2]   gradient overlays
     *  z-[10]  hero copy
     *
     * overflow-hidden on <section> is the only clip boundary needed.
     * bg-[#F7F6FE] is the gradient-fallback if video fails to load.
     */
    <section
      ref={sectionRef}
      className="relative min-h-screen flex items-center overflow-hidden bg-[#F7F6FE]"
    >

      {/* ── 1. Video ─────────────────────────────────────────────────── */}
      {/*
       * Plain div: absolute inset-0, z-[1], NO overflow-hidden.
       * (Section already clips everything. An extra overflow-hidden here
       *  can cause zero-height resolution for the child motion.div in
       *  some browsers when the child extends outside the parent bounds.)
       *
       * motion.div: absolute inset-0 + scale(1.12) so the video has
       * bleed room for the parallax translateY without exposing edges.
       * It receives ONLY the motion value `y` — no static CSS positioning
       * mixed into the same style prop.
       *
       * DEBUG: outline is intentional for render verification.
       * Remove it once you confirm the video is visible.
       */}
      <div
        className="absolute inset-0 z-[1]"
        aria-hidden="true"
        style={{ outline: '2px solid red' }}
      >
        <motion.div
          style={{ y: videoY, scale: 1.12 }}
          className="absolute inset-0 will-change-transform origin-center"
        >
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: 1, filter: 'brightness(0.72) saturate(0.82)' }}
          >
            <source src="/videos/hero-bg.mp4"  type="video/mp4" />
            <source src="/videos/hero-bg.webm" type="video/webm" />
          </video>
        </motion.div>
      </div>

      {/* ── 2. Overlays ───────────────────────────────────────────────── */}
      {/*
       * Directional gradient — left side has enough opacity to keep text
       * readable, but is no longer near-solid: max 0.82 instead of 0.97.
       * The right half (56 % onward) drops to near-transparent so the
       * video is clearly visible there.
       */}
      <div
        className="absolute inset-0 z-[2] pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            'linear-gradient(108deg,' +
            ' rgba(247,246,254,0.82)  0%,' +
            ' rgba(247,246,254,0.72) 32%,' +
            ' rgba(247,246,254,0.38) 56%,' +
            ' rgba(247,246,254,0.06) 100%)',
        }}
      />

      {/* Top chrome */}
      <div
        className="absolute inset-x-0 top-0 h-32 z-[2] pointer-events-none"
        aria-hidden="true"
        style={{
          background: 'linear-gradient(to bottom, rgba(247,246,254,0.75) 0%, transparent 100%)',
        }}
      />

      {/* Bottom section-blend */}
      <div
        className="absolute inset-x-0 bottom-0 h-44 z-[2] pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            'linear-gradient(to top, rgba(247,246,254,1.00) 0%, rgba(247,246,254,0.55) 55%, transparent 100%)',
        }}
      />

      {/* ── 3. Hero copy ─────────────────────────────────────────────── */}
      <motion.div
        style={{ y: textY, opacity: textOp }}
        className="relative z-[10] w-full max-w-6xl mx-auto px-6 py-32 lg:py-0 lg:min-h-screen lg:flex lg:items-center"
      >
        <div className="max-w-[580px]">

          {/* Eyebrow */}
          <motion.div custom={0.1} variants={fadeUp} initial="hidden" animate="visible">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 mb-8
              bg-white/70 border border-slate-200/55 rounded-full backdrop-blur-sm
              text-[11px] font-semibold text-slate-500 tracking-wide
              shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
              ✦&nbsp; Inteligência artificial para marketing
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            custom={0.22}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[44px] sm:text-[54px] lg:text-[62px]
              font-extrabold text-slate-900 leading-[1.05] tracking-[-0.034em] mb-6"
          >
            Automatize seu{' '}
            <span className="block">marketing com</span>
            <span className="block">inteligência.</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            custom={0.36}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[17px] sm:text-[18px] text-slate-500 leading-relaxed mb-10 max-w-[460px]"
          >
            O{' '}
            <NezoraMark className="font-semibold text-slate-800" />
            {' '}organiza, cria e executa sua operação de marketing com IA.
          </motion.p>

          {/* CTAs */}
          <motion.div
            custom={0.48}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="flex flex-col sm:flex-row items-start gap-3 mb-10"
          >
            <Link
              href="/register"
              className="group btn-primary-soft inline-flex items-center gap-2
                px-7 py-3.5 rounded-full
                text-white text-[15px] font-semibold
                hover:scale-[1.02] active:scale-[0.99]
                transition-transform duration-200 will-change-transform"
            >
              Começar agora
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" strokeWidth={1.5} />
            </Link>

            <button
              onClick={() =>
                document.getElementById('why')?.scrollIntoView({ behavior: 'smooth' })
              }
              className="btn-secondary-soft inline-flex items-center gap-1.5
                px-6 py-3.5 rounded-full
                text-[15px] font-medium text-slate-600 hover:text-slate-900
                hover:scale-[1.02] active:scale-[0.99]
                transition-transform duration-200 will-change-transform"
            >
              Ver como funciona
            </button>
          </motion.div>

          {/* Trust strip */}
          <motion.div
            custom={0.58}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="flex flex-wrap items-center gap-x-5 gap-y-2"
          >
            {[
              'Sem cartão de crédito',
              '7 dias grátis',
              'Cancele quando quiser',
            ].map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-[12px] text-slate-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                {t}
              </span>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </section>
  )
}
