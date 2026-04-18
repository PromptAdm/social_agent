import Link from 'next/link'
import {
  ArrowRight, Zap, CalendarDays, BarChart3,
  CheckSquare, Lightbulb, TrendingUp, Bell,
} from 'lucide-react'

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-14">

      {/* ── Background ───────────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[700px]
          bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.13)_0%,transparent_65%)]" />
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px]
          bg-[radial-gradient(circle,rgba(139,92,246,0.07)_0%,transparent_70%)]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px]
          bg-[radial-gradient(circle,rgba(99,102,241,0.05)_0%,transparent_70%)]" />
        <div className="absolute inset-0 dot-grid opacity-35" />
        <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#09090E] to-transparent" />
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-5 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 xl:gap-20 items-center">

          {/* ── Left: copy ───────────────────────────────────────────── */}
          <div className="text-center lg:text-left">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5
              bg-indigo-600/10 border border-indigo-500/20 rounded-full
              text-[12px] font-semibold text-indigo-400 mb-7 animate-fade-in">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Gestão de redes sociais com IA
            </div>

            {/* Headline */}
            <h1 className="text-[40px] sm:text-[52px] lg:text-[56px] xl:text-[62px]
              font-bold leading-[1.07] tracking-tight text-slate-100 mb-6
              animate-fade-in-up animate-delay-100">
              Conteúdo{' '}
              <span className="gradient-text-shimmer">profissional</span>
              <br />
              para redes sociais,
              <br />
              <span className="text-slate-400 font-semibold">sem o caos.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-[16px] sm:text-[18px] text-slate-400 leading-relaxed mb-9
              max-w-xl mx-auto lg:mx-0 animate-fade-in-up animate-delay-200">
              Nezora organiza sua presença digital — gera ideias, cria textos com IA,
              agenda publicações e entrega analytics reais.{' '}
              <span className="text-slate-300">Tudo em um só lugar.</span>
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center lg:items-start
              justify-center lg:justify-start gap-3 mb-8 animate-fade-in-up animate-delay-300">
              <Link
                href="/register"
                className="group flex items-center gap-2 px-7 py-3.5
                  bg-gradient-to-r from-indigo-600 to-indigo-500
                  hover:from-indigo-500 hover:to-indigo-400 text-white
                  text-[15px] font-semibold rounded-xl transition-all
                  shadow-2xl shadow-indigo-600/30 hover:shadow-indigo-500/40 hover:-translate-y-0.5"
              >
                Começar agora — é grátis
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="/login"
                className="flex items-center gap-2 px-7 py-3.5 bg-white/4 hover:bg-white/7
                  border border-white/10 hover:border-white/20 text-slate-300
                  hover:text-slate-100 text-[15px] font-medium rounded-xl transition-all"
              >
                Já tenho conta
              </Link>
            </div>

            {/* Trust */}
            <p className="text-[12px] text-slate-600 animate-fade-in-up animate-delay-400">
              Sem cartão de crédito · 7 dias grátis · Cancele quando quiser
            </p>
          </div>

          {/* ── Right: SaaS mockup ───────────────────────────────────── */}
          <div className="relative hidden lg:block animate-fade-in-up animate-delay-300">

            {/* Glow under card */}
            <div className="absolute -inset-4 bg-indigo-600/8 rounded-3xl blur-3xl pointer-events-none" />

            {/* Browser shell */}
            <div className="relative bg-[#0C0C11] border border-[#1E1E2A] rounded-2xl shadow-2xl shadow-black/70 overflow-hidden">

              {/* Title bar */}
              <div className="flex items-center gap-2 px-4 py-3 bg-[#09090E] border-b border-[#1A1A24]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-[#111118] border border-[#1E1E2A] rounded-md">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
                    <span className="text-[10px] text-slate-600 font-mono">app.nezora.com.br</span>
                  </div>
                </div>
                <div className="relative p-1.5">
                  <Bell className="w-3 h-3 text-slate-600" />
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                </div>
              </div>

              {/* App shell */}
              <div className="flex" style={{ height: '390px' }}>

                {/* Sidebar */}
                <div className="w-[136px] flex-shrink-0 bg-[#09090E] border-r border-[#1A1A24] py-4 px-3">
                  <div className="flex items-center gap-1.5 px-1 mb-5">
                    <div className="w-5 h-5 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-md flex items-center justify-center">
                      <span className="text-[8px] font-bold text-white">N</span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-300">Nezora</span>
                  </div>
                  {[
                    { Icon: BarChart3,    label: 'Dashboard',  active: true  },
                    { Icon: Lightbulb,   label: 'Ideias',     active: false },
                    { Icon: CalendarDays,label: 'Calendário', active: false },
                    { Icon: CheckSquare, label: 'Aprovação',  active: false },
                    { Icon: TrendingUp,  label: 'Analytics',  active: false },
                  ].map(({ Icon, label, active }) => (
                    <div key={label} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg mb-0.5 ${
                      active ? 'bg-indigo-600/15 text-indigo-400' : 'text-slate-600'
                    }`}>
                      <Icon className="w-3 h-3 flex-shrink-0" />
                      <span className="text-[10px] font-medium">{label}</span>
                    </div>
                  ))}
                </div>

                {/* Main */}
                <div className="flex-1 p-4 overflow-hidden">

                  {/* KPIs */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { label: 'Posts gerados', value: '247',  color: 'indigo',  Icon: Zap           },
                      { label: 'Agendados',     value: '38',   color: 'violet',  Icon: CalendarDays  },
                      { label: 'Engajamento',   value: '+18%', color: 'emerald', Icon: TrendingUp    },
                    ].map(({ label, value, color, Icon }) => (
                      <div key={label} className="bg-[#09090E] border border-[#1A1A24] rounded-xl p-2.5">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center mb-2 ${
                          color === 'indigo'  ? 'bg-indigo-600/15'  :
                          color === 'violet'  ? 'bg-violet-600/15'  : 'bg-emerald-600/15'
                        }`}>
                          <Icon className={`w-3 h-3 ${
                            color === 'indigo'  ? 'text-indigo-400' :
                            color === 'violet'  ? 'text-violet-400' : 'text-emerald-400'
                          }`} />
                        </div>
                        <p className="text-[8px] text-slate-600 mb-0.5">{label}</p>
                        <p className="text-[14px] font-bold text-slate-100">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Bar chart */}
                  <div className="bg-[#09090E] border border-[#1A1A24] rounded-xl p-3 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] text-slate-600 font-medium">Publicações por semana</span>
                      <span className="text-[9px] text-indigo-400">30 dias</span>
                    </div>
                    <div className="flex items-end gap-1 h-12">
                      {[30, 55, 40, 70, 45, 85, 60, 95, 50, 75, 90, 65].map((h, i) => (
                        <div key={i} className={`flex-1 rounded-sm ${
                          i === 11 ? 'bg-indigo-500' : 'bg-indigo-600/30'
                        }`} style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>

                  {/* Posts */}
                  <div className="space-y-1.5">
                    {[
                      { title: 'Dicas para aumentar engajamento', status: 'Publicado', c: 'emerald' },
                      { title: 'Por que consistência é chave',     status: 'Agendado',  c: 'indigo'  },
                      { title: '5 erros em social media',          status: 'Rascunho',  c: 'amber'   },
                    ].map(({ title, status, c }) => (
                      <div key={title} className="flex items-center gap-2 bg-[#09090E] border border-[#1A1A24] rounded-lg px-2.5 py-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          c === 'emerald' ? 'bg-emerald-500' : c === 'indigo' ? 'bg-indigo-500' : 'bg-amber-500'
                        }`} />
                        <span className="flex-1 text-[9px] text-slate-400 truncate">{title}</span>
                        <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full ${
                          c === 'emerald' ? 'text-emerald-400 bg-emerald-400/10' :
                          c === 'indigo'  ? 'text-indigo-400  bg-indigo-400/10'  :
                                           'text-amber-400   bg-amber-400/10'
                        }`}>{status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Floating badge — bottom left */}
            <div className="absolute -bottom-4 -left-5 bg-[#111118] border border-[#27273A]
              rounded-2xl px-4 py-3 shadow-xl shadow-black/50 animate-float">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-emerald-500/15 border border-emerald-500/20 rounded-xl flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-200">Conteúdo gerado</p>
                  <p className="text-[10px] text-slate-500">5 posts prontos para revisar</p>
                </div>
              </div>
            </div>

            {/* Floating badge — top right */}
            <div className="absolute -top-4 -right-4 bg-[#111118] border border-[#27273A]
              rounded-2xl px-4 py-3 shadow-xl shadow-black/50 animate-float animate-delay-400">
              <p className="text-[9px] text-slate-600 mb-0.5">Alcance estimado</p>
              <p className="text-[18px] font-bold text-slate-100 leading-none">24.8k</p>
              <p className="text-[10px] text-emerald-400 font-medium mt-0.5">↑ 12% esta semana</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
