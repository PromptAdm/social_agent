import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react'

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-16">

      {/* ── Background ─────────────────────────────────────────────────── */}
      <div className="absolute inset-0" aria-hidden="true">
        {/* Base gradient — light lavender */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#EEECff] via-[#F7F6FE] to-[#F0EEFF]" />

        {/* Soft radial glows */}
        <div className="absolute top-0 right-1/4 w-[700px] h-[700px]
          bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.12)_0%,transparent_60%)]" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px]
          bg-[radial-gradient(ellipse_at_bottom_left,rgba(99,102,241,0.10)_0%,transparent_65%)]" />
        <div className="absolute top-1/3 left-0 w-[400px] h-[400px]
          bg-[radial-gradient(circle,rgba(219,214,255,0.5)_0%,transparent_70%)]" />

        {/* Dot grid overlay — very subtle */}
        <div className="absolute inset-0 dot-grid-light" />

        {/* Bottom blend to section below */}
        <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#F7F6FE] to-transparent" />
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-8 xl:gap-12 items-center min-h-[calc(100vh-64px)] py-20 lg:py-12">

          {/* Left: copy */}
          <div className="max-w-[560px] mx-auto lg:mx-0 text-center lg:text-left">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8
              bg-white/80 border border-indigo-200/60 rounded-full
              shadow-[0_1px_8px_rgba(99,102,241,0.1)]
              text-[12px] font-semibold text-indigo-600 tracking-wide
              animate-rise">
              <Sparkles className="w-3 h-3" />
              Gestão de redes sociais com IA
            </div>

            {/* Headline */}
            <h1 className="text-[46px] sm:text-[56px] lg:text-[60px] xl:text-[68px]
              font-extrabold text-slate-900 leading-[1.04] tracking-[-0.035em] mb-6
              animate-rise-100">
              Redes sociais em{' '}
              <span className="hero-gradient-text">piloto automático</span>
            </h1>

            {/* Subtitle */}
            <p className="text-[17px] sm:text-[18px] text-slate-500 leading-relaxed mb-10
              max-w-[480px] mx-auto lg:mx-0 animate-rise-200">
              Gere conteúdo, agende publicações e acompanhe resultados
              com inteligência artificial. A plataforma para marcas que
              levam o social a sério.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center lg:items-start
              justify-center lg:justify-start gap-3 mb-10 animate-rise-300">
              <Link
                href="/register"
                className="group inline-flex items-center gap-2 px-7 py-3.5
                  bg-slate-900 hover:bg-slate-800 text-white
                  text-[15px] font-semibold rounded-full
                  shadow-[0_4px_20px_rgba(15,15,26,0.25)]
                  hover:shadow-[0_8px_28px_rgba(15,15,26,0.32)]
                  hover:-translate-y-0.5 transition-all duration-200"
              >
                Criar conta grátis
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-6 py-3.5
                  text-[15px] font-medium text-slate-500 hover:text-slate-900
                  transition-colors"
              >
                Já tenho conta
              </Link>
            </div>

            {/* Trust strip */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start
              gap-x-5 gap-y-2 animate-rise-400">
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
            </div>
          </div>

          {/* Right: visual composition */}
          <div className="relative hidden lg:flex items-center justify-center animate-rise-200">

            {/* Background blobs behind image */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[600px] h-[600px] bg-gradient-to-br from-violet-200/50 via-purple-100/30 to-blue-100/20 rounded-full blur-3xl" />
            </div>
            <div className="absolute top-10 right-0 w-[300px] h-[300px]
              bg-gradient-to-bl from-pink-200/30 to-transparent rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-10 left-0 w-[250px] h-[250px]
              bg-gradient-to-tr from-blue-200/30 to-transparent rounded-full blur-2xl pointer-events-none" />

            {/* Main visual — phone mockups */}
            <div className="relative z-10 w-full max-w-[600px] animate-float-soft">
              <Image
                src="/images/mockup-phones.png"
                alt="Nezora App — gestão de redes sociais com IA"
                width={1000}
                height={720}
                className="w-full h-auto object-contain drop-shadow-[0_40px_80px_rgba(79,70,229,0.18)]"
                priority
              />
            </div>

            {/* Floating card — engagement */}
            <div className="absolute top-12 -left-6 z-20
              glass-light rounded-2xl px-4 py-3
              shadow-[0_8px_32px_rgba(0,0,0,0.12)]
              animate-float-soft-slow">
              <p className="text-[10px] font-semibold text-slate-400 mb-1">Engajamento semanal</p>
              <p className="text-[22px] font-bold text-slate-900 leading-none">+18%</p>
              <p className="text-[11px] text-emerald-500 font-semibold mt-0.5">↑ em relação à semana passada</p>
            </div>

            {/* Floating card — content generated */}
            <div className="absolute bottom-16 -right-4 z-20
              glass-light rounded-2xl px-4 py-3
              shadow-[0_8px_32px_rgba(0,0,0,0.12)]
              animate-float-soft">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600
                  rounded-xl flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-800">5 posts gerados</p>
                  <p className="text-[10px] text-slate-400">prontos para revisão</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
