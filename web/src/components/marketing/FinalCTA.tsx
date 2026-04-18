import Link from 'next/link'
import { ArrowRight, CheckCircle2, Hexagon } from 'lucide-react'

export function FinalCTA() {
  return (
    <section id="cta" className="py-28 px-5 relative overflow-hidden">

      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.12)_0%,transparent_65%)] animate-glow-pulse" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(139,92,246,0.08)_0%,transparent_70%)] animate-glow-pulse animate-delay-400" />
        </div>
        <div className="absolute inset-0 dot-grid opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#09090E]/80 via-transparent to-[#09090E]/80" />
      </div>

      <div className="relative max-w-3xl mx-auto text-center">

        {/* Icon */}
        <div className="inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-8 animate-float
          bg-gradient-to-br from-indigo-600/20 to-violet-600/10
          border border-indigo-500/25 shadow-xl shadow-indigo-500/15">
          <Hexagon className="w-7 h-7 text-indigo-400" />
        </div>

        {/* Headline */}
        <h2 className="text-[38px] sm:text-[52px] font-bold text-slate-100
          leading-[1.08] tracking-tight mb-6">
          Comece hoje.{' '}
          <span className="gradient-text-shimmer">7 dias grátis.</span>
          <span className="block text-slate-400 text-[22px] sm:text-[28px]
            font-normal mt-3 leading-snug">
            Sem cartão. Sem compromisso.
          </span>
        </h2>

        <p className="text-[16px] text-slate-400 leading-relaxed mb-10 max-w-lg mx-auto">
          Crie sua conta em menos de 2 minutos e veja como é ter seu conteúdo
          organizado, gerado e agendado de verdade.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
          <Link
            href="/register"
            className="group flex items-center gap-2 px-8 py-4
              bg-gradient-to-r from-indigo-600 to-indigo-500
              hover:from-indigo-500 hover:to-indigo-400
              text-white text-[16px] font-bold rounded-xl transition-all
              shadow-2xl shadow-indigo-600/35 hover:shadow-indigo-500/45 hover:-translate-y-0.5"
          >
            Criar minha conta grátis
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/login"
            className="px-8 py-4 text-[15px] font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            Já tenho conta — entrar
          </Link>
        </div>

        {/* Trust items */}
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {[
            'Sem cartão de crédito',
            'Cancele quando quiser',
            'Dados sob a LGPD',
            'Suporte em português',
          ].map((item) => (
            <span key={item} className="flex items-center gap-1.5 text-[12px] text-slate-600">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/60 flex-shrink-0" />
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
