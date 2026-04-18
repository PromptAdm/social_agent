import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react'

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-16">

      {/* ── Background ─────────────────────────────────────────────────── */}
      <div className="absolute inset-0" aria-hidden="true">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#ECEBFF] via-[#F5F4FD] to-[#F9F6FF]" />

        {/* Layered radial glows */}
        <div className="absolute -top-20 right-0 w-[800px] h-[700px]
          bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.11)_0%,transparent_55%)]" />
        <div className="absolute bottom-0 -left-20 w-[600px] h-[500px]
          bg-[radial-gradient(ellipse_at_bottom_left,rgba(99,102,241,0.09)_0%,transparent_60%)]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px]
          bg-[radial-gradient(ellipse_at_center,rgba(224,221,255,0.35)_0%,transparent_65%)]" />

        {/* Abstract floating spheres */}
        <div className="absolute top-[18%] right-[12%] w-[110px] h-[110px] rounded-full
          bg-gradient-to-br from-violet-200/70 to-indigo-200/50
          blur-[3px] animate-float-soft pointer-events-none" />
        <div className="absolute top-[55%] right-[4%] w-[64px] h-[64px] rounded-full
          bg-gradient-to-br from-blue-200/60 to-violet-100/40
          blur-[2px] animate-float-soft-slow pointer-events-none" />
        <div className="absolute top-[35%] left-[6%] w-[80px] h-[80px] rounded-full
          bg-gradient-to-br from-purple-100/60 to-pink-100/40
          blur-[2px] animate-float-soft-d2 pointer-events-none" />
        <div className="absolute top-[70%] left-[22%] w-[48px] h-[48px] rounded-full
          bg-gradient-to-br from-indigo-200/50 to-blue-100/30
          blur-[1px] animate-float-soft-d3 pointer-events-none" />

        {/* Dot grid overlay */}
        <div className="absolute inset-0 dot-grid-light opacity-60" />

        {/* Bottom blend */}
        <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-[#F7F6FE] to-transparent" />
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
                  bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500
                  hover:from-indigo-500 hover:via-violet-500 hover:to-indigo-400
                  text-white text-[15px] font-semibold rounded-full
                  shadow-[0_4px_20px_rgba(99,102,241,0.35)]
                  hover:shadow-[0_8px_28px_rgba(99,102,241,0.45)]
                  hover:-translate-y-0.5 hover:scale-[1.02]
                  transition-all duration-200"
              >
                Criar conta grátis
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-5 py-3.5
                  text-[15px] font-medium text-slate-500 hover:text-slate-800
                  border border-slate-200/80 hover:border-slate-300 rounded-full
                  hover:bg-white/60 hover:shadow-sm
                  transition-all duration-200"
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
              bg-white/80 backdrop-blur-md
              ring-1 ring-white/90 rounded-2xl px-4 py-3.5
              shadow-[0_4px_24px_rgba(99,102,241,0.12),0_1px_4px_rgba(0,0,0,0.06)]
              animate-float-soft-slow">
              <p className="text-[10px] font-semibold text-slate-400 mb-1 tracking-wide uppercase">Engajamento semanal</p>
              <p className="text-[22px] font-bold text-slate-900 leading-none tracking-tight">+18%</p>
              <p className="text-[11px] text-emerald-500 font-semibold mt-1">↑ vs. semana passada</p>
            </div>

            {/* Floating card — content generated */}
            <div className="absolute bottom-16 -right-4 z-20
              bg-white/80 backdrop-blur-md
              ring-1 ring-white/90 rounded-2xl px-4 py-3.5
              shadow-[0_4px_24px_rgba(99,102,241,0.12),0_1px_4px_rgba(0,0,0,0.06)]
              animate-float-soft">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600
                  rounded-xl flex items-center justify-center flex-shrink-0
                  shadow-sm shadow-indigo-500/30">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-slate-800 leading-tight">5 posts gerados</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">prontos para revisão</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
