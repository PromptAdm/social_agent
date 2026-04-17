import Link from 'next/link'
import { ArrowRight, Hexagon } from 'lucide-react'

export function FinalCTA() {
  return (
    <section id="cta" className="py-28 px-5 relative overflow-hidden">

      {/* Large glow blob */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        aria-hidden="true"
      >
        <div className="w-[700px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px] animate-glow-pulse" />
        <div className="absolute w-[400px] h-[300px] bg-violet-600/8 rounded-full blur-[100px] animate-glow-pulse animate-delay-400" />
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(99,102,241,0.5) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(99,102,241,0.5) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
        aria-hidden="true"
      />

      <div className="relative max-w-3xl mx-auto text-center">

        {/* Icon */}
        <div className="inline-flex w-14 h-14 bg-indigo-600/15 border border-indigo-500/25 rounded-2xl items-center justify-center mb-8 animate-float">
          <Hexagon className="w-7 h-7 text-indigo-400" />
        </div>

        <h2 className="text-[36px] sm:text-[48px] font-bold text-slate-100 leading-[1.1] tracking-tight mb-6">
          Comece hoje.{' '}
          <span className="gradient-text">7 dias grátis.</span>
          <span className="block text-slate-400 text-[22px] sm:text-[28px] font-normal mt-3 leading-snug">
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
            className="group flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white text-[16px] font-bold rounded-xl transition-all shadow-2xl shadow-indigo-600/30 hover:shadow-indigo-500/40 hover:-translate-y-0.5"
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

        {/* Micro trust */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-slate-600">
          <span>✓ Sem cartão de crédito</span>
          <span>✓ Cancel quando quiser</span>
          <span>✓ Dados sob a LGPD</span>
          <span>✓ Suporte em português</span>
        </div>
      </div>
    </section>
  )
}
