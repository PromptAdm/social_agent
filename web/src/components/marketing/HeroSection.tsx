import Link from 'next/link'
import { ArrowRight, Zap, CalendarDays, BarChart3 } from 'lucide-react'

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-14">

      {/* Background glow blobs */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
      >
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-indigo-600/8 rounded-full blur-[120px] animate-glow-pulse" />
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-violet-600/6 rounded-full blur-[100px] animate-glow-pulse animate-delay-300" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[80px] animate-glow-pulse animate-delay-500" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-5xl mx-auto px-5 text-center">

        {/* Pre-headline badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-600/10 border border-indigo-500/20 rounded-full text-[12px] font-medium text-indigo-400 mb-8 animate-fade-in">
          <Zap className="w-3 h-3" />
          Gestão de redes sociais com inteligência artificial
        </div>

        {/* Main headline */}
        <h1 className="text-[42px] sm:text-[56px] lg:text-[68px] font-bold leading-[1.08] tracking-tight text-slate-100 mb-6 animate-fade-in-up animate-delay-100">
          Conteúdo profissional{' '}
          <br className="hidden sm:block" />
          para redes sociais,{' '}
          <span className="gradient-text">sem o caos</span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-2xl mx-auto text-[17px] sm:text-[19px] text-slate-400 leading-relaxed mb-10 animate-fade-in-up animate-delay-200">
          Nezora organiza sua presença digital — gera ideias, cria textos com IA,
          agenda publicações e entrega analytics reais.{' '}
          <span className="text-slate-300">Tudo em um só lugar.</span>
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16 animate-fade-in-up animate-delay-300">
          <Link
            href="/register"
            className="group flex items-center gap-2 px-7 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[15px] font-semibold rounded-xl transition-all shadow-2xl shadow-indigo-600/25 hover:shadow-indigo-500/35 hover:-translate-y-0.5"
          >
            Começar agora — é grátis
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-2 px-7 py-3.5 bg-white/5 hover:bg-white/8 border border-white/10 hover:border-white/20 text-slate-300 hover:text-slate-100 text-[15px] font-medium rounded-xl transition-all"
          >
            Já tenho conta — entrar
          </Link>
        </div>

        {/* Social proof line */}
        <p className="text-[12px] text-slate-600 mb-16 animate-fade-in-up animate-delay-400">
          Sem cartão de crédito · Cancele quando quiser · Seus dados são seus
        </p>

        {/* Mock UI card */}
        <div className="relative max-w-3xl mx-auto animate-fade-in-up animate-delay-500">

          {/* Glow under card */}
          <div className="absolute -inset-x-8 -bottom-8 top-8 bg-indigo-600/10 rounded-3xl blur-3xl" aria-hidden="true" />

          <div className="relative bg-[#0F0F17] border border-[#1E1E2A] rounded-2xl overflow-hidden shadow-2xl shadow-black/60">
            {/* Fake title bar */}
            <div className="flex items-center gap-2 px-5 py-3.5 bg-[#0C0C11] border-b border-[#1E1E2A]">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-amber-500/60" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
              <div className="flex-1 mx-4">
                <div className="max-w-[200px] mx-auto h-5 bg-[#17171F] rounded-md border border-[#27273A] flex items-center justify-center">
                  <span className="text-[10px] text-slate-600">app.nezora.com.br</span>
                </div>
              </div>
            </div>

            {/* Mock content area */}
            <div className="p-6 grid grid-cols-3 gap-4">
              {/* Stats cards */}
              {[
                { icon: Zap,          label: 'Posts gerados',   value: '247',  color: 'indigo' },
                { icon: CalendarDays, label: 'Agendados',        value: '38',   color: 'violet' },
                { icon: BarChart3,    label: 'Alcance est.',     value: '12.4k', color: 'emerald' },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="bg-[#0C0C11] border border-[#1E1E2A] rounded-xl p-4">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-3 ${
                    color === 'indigo'  ? 'bg-indigo-600/15' :
                    color === 'violet'  ? 'bg-violet-600/15' :
                                          'bg-emerald-600/15'
                  }`}>
                    <Icon className={`w-3.5 h-3.5 ${
                      color === 'indigo'  ? 'text-indigo-400' :
                      color === 'violet'  ? 'text-violet-400' :
                                            'text-emerald-400'
                    }`} />
                  </div>
                  <p className="text-[11px] text-slate-600 mb-1">{label}</p>
                  <p className="text-[18px] font-bold text-slate-100">{value}</p>
                </div>
              ))}
            </div>

            {/* Mock post list */}
            <div className="px-6 pb-6 space-y-2.5">
              {[
                { title: 'Dicas para aumentar engajamento no Instagram',  status: 'Publicado',  color: 'emerald' },
                { title: 'Por que consistência é mais importante que viral', status: 'Agendado',   color: 'indigo' },
                { title: '5 erros comuns em social media e como evitar',   status: 'Rascunho',   color: 'amber' },
              ].map(({ title, status, color }) => (
                <div key={title} className="flex items-center gap-3 bg-[#0C0C11] border border-[#1E1E2A] rounded-lg px-4 py-3">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    color === 'emerald' ? 'bg-emerald-500' :
                    color === 'indigo'  ? 'bg-indigo-500' :
                                          'bg-amber-500'
                  }`} />
                  <span className="flex-1 text-[12px] text-slate-400 text-left truncate">{title}</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    color === 'emerald' ? 'text-emerald-400 bg-emerald-400/10' :
                    color === 'indigo'  ? 'text-indigo-400 bg-indigo-400/10' :
                                          'text-amber-400 bg-amber-400/10'
                  }`}>{status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
