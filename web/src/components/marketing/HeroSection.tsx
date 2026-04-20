'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, CheckCircle2, LayoutDashboard } from 'lucide-react'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'

export function HeroSection() {
  const isLoading        = useAuthStore((s) => s.isLoading)
  const isAuthenticated  = useAuthStore((s) => s.isAuthenticated)
  const showDashboardCTA = !isLoading && isAuthenticated

  // Scroll-driven motion — gentle fade + drift, no heavy parallax
  const { scrollY } = useScroll()
  const rawOpacity  = useTransform(scrollY, [0, 500], [1, 0])
  const rawY        = useTransform(scrollY, [0, 500], [0, -36])
  const rawBgScale  = useTransform(scrollY, [0, 800], [1, 1.04])

  const opacity = useSpring(rawOpacity, { stiffness: 60, damping: 28 })
  const y       = useSpring(rawY,       { stiffness: 60, damping: 28 })
  const bgScale = useSpring(rawBgScale, { stiffness: 45, damping: 30 })

  return (
    <section
      className="relative overflow-hidden"
      style={{ height: '100vh', minHeight: '640px' }}
    >
      {/* Background image — subtle scale on scroll */}
      <motion.div className="absolute inset-0 z-0" style={{ scale: bgScale }}>
        <Image
          src="/videos/hero.png"
          alt=""
          fill
          priority
          sizes="100vw"
          quality={90}
          style={{ objectFit: 'cover', objectPosition: '60% center' }}
        />
      </motion.div>

      {/* Single overlay: left-to-right gradient for text readability only */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            'linear-gradient(100deg, rgba(3,4,18,0.78) 0%, rgba(3,4,18,0.52) 36%, rgba(3,4,18,0.18) 62%, rgba(3,4,18,0.04) 100%)',
        }}
      />

      {/* Content — fades and drifts on scroll */}
      <motion.div
        className="absolute inset-0 z-20 flex items-center"
        style={{ opacity, y }}
      >
        <div className="w-full max-w-6xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="max-w-[560px]">

            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8
              bg-white/[0.06] border border-white/[0.12] rounded-full backdrop-blur-sm">
              <span className="w-[5px] h-[5px] rounded-full bg-indigo-400
                shadow-[0_0_6px_2px_rgba(129,140,248,0.55)] flex-shrink-0" />
              <span className="text-[11.5px] font-semibold text-white/65 tracking-[0.03em]">
                Inteligência artificial para marketing
              </span>
            </div>

            {/* Headline */}
            <h1
              className="font-extrabold text-white leading-[1.03] tracking-[-0.036em] mb-6"
              style={{ fontSize: 'clamp(38px, 5.2vw, 66px)' }}
            >
              Automatize seu{' '}
              <span className="block">marketing com</span>
              <span
                className="block"
                style={{
                  background: 'linear-gradient(130deg, #a78bfa 0%, #818cf8 42%, #38bdf8 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                inteligência.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-[17px] sm:text-[18px] text-white/55 leading-[1.68] mb-10 max-w-[450px]">
              Nezora organiza, cria e executa sua operação de
              marketing com IA — sem esforço manual.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 mb-10">
              {showDashboardCTA ? (
                <Link
                  href="/overview"
                  className="group inline-flex items-center gap-2
                    px-7 py-3.5 rounded-full
                    bg-white text-slate-900 text-[15px] font-bold
                    hover:bg-slate-50 hover:scale-[1.02] active:scale-[0.98]
                    shadow-[0_4px_24px_rgba(0,0,0,0.28)]
                    transition-all duration-200 will-change-transform"
                >
                  <LayoutDashboard className="w-[15px] h-[15px] flex-shrink-0" />
                  Ir para o Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="group inline-flex items-center gap-2
                      px-7 py-3.5 rounded-full
                      bg-white text-slate-900 text-[15px] font-bold
                      hover:bg-slate-50 hover:scale-[1.02] active:scale-[0.98]
                      shadow-[0_4px_24px_rgba(0,0,0,0.28)]
                      transition-all duration-200 will-change-transform"
                  >
                    Começar grátis
                    <ArrowRight
                      className="w-[15px] h-[15px] group-hover:translate-x-0.5 transition-transform duration-200 flex-shrink-0"
                      strokeWidth={2.2}
                    />
                  </Link>

                  <button
                    onClick={() =>
                      document.getElementById('why')?.scrollIntoView({ behavior: 'smooth' })
                    }
                    className="inline-flex items-center
                      px-6 py-3.5 rounded-full
                      text-[15px] font-semibold text-white/72 hover:text-white
                      border border-white/[0.16] hover:border-white/28
                      hover:bg-white/[0.06] backdrop-blur-sm
                      hover:scale-[1.02] active:scale-[0.98]
                      transition-all duration-200 will-change-transform"
                  >
                    Ver como funciona
                  </button>
                </>
              )}
            </div>

            {/* Trust strip */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {[
                'Sem cartão de crédito',
                '7 dias grátis',
                'Cancele quando quiser',
              ].map((t) => (
                <span
                  key={t}
                  className="flex items-center gap-1.5 text-[12px] text-white/38 tracking-[0.01em]"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/60 flex-shrink-0" />
                  {t}
                </span>
              ))}
            </div>

          </div>
        </div>
      </motion.div>

    </section>
  )
}
