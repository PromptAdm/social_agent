import { ShieldCheck, Lock, RefreshCw, Headphones } from 'lucide-react'

const stats = [
  { value: '100%',    label: 'Hospedado no Brasil',     sub: 'Dados sob a LGPD'           },
  { value: '7 dias',  label: 'Trial gratuito',           sub: 'Sem cartão de crédito'       },
  { value: '99.9%',   label: 'Uptime monitorado',        sub: 'Infraestrutura redundante'   },
  { value: 'Seu',     label: 'Seu conteúdo',             sub: 'Propriedade intelectual sua' },
]

const trust = [
  {
    icon:  ShieldCheck,
    title: 'Seus dados são seus',
    body:  'Nunca vendemos ou compartilhamos suas informações. Você pode exportar ou deletar sua conta a qualquer momento.',
  },
  {
    icon:  Lock,
    title: 'Segurança em cada camada',
    body:  'Autenticação segura, comunicação criptografada, backups automáticos e monitoramento ativo.',
  },
  {
    icon:  RefreshCw,
    title: 'Sempre melhorando',
    body:  'Atualizações frequentes baseadas no uso real dos clientes. Você cresce junto com o produto.',
  },
  {
    icon:  Headphones,
    title: 'Suporte humano',
    body:  'Sem chatbot de terceiro nível. Se você tiver problema, uma pessoa real vai ajudar.',
  },
]

export function TrustSection() {
  return (
    <section id="trust" className="py-28 px-6 bg-[#F7F6FE] relative overflow-hidden">

      {/* Top + bottom dividers */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-200/60 to-transparent" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-indigo-200/60 to-transparent" aria-hidden="true" />

      {/* Subtle background radial */}
      <div
        className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-[700px] h-[500px]
          bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.05)_0%,transparent_70%)]
          pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-5xl mx-auto relative">

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 rounded-2xl overflow-hidden mb-20
          border border-slate-200/70 divide-x divide-y md:divide-y-0 divide-slate-200/70
          shadow-[0_1px_8px_rgba(0,0,0,0.05)]">
          {stats.map(({ value, label, sub }) => (
            <div key={label} className="bg-white hover:bg-indigo-50/30 transition-colors px-6 py-8 text-center group">
              <p className="text-[36px] font-extrabold leading-none mb-2 mktg-gradient-text tracking-tight">
                {value}
              </p>
              <p className="text-[13px] font-semibold text-slate-700 mb-1">{label}</p>
              <p className="text-[11px] text-slate-400">{sub}</p>
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block text-[11px] font-bold tracking-[0.14em] uppercase text-indigo-600 mb-4">
            Você pode confiar
          </span>
          <h2 className="text-[30px] sm:text-[38px] font-bold text-slate-900 leading-tight tracking-tight">
            Construído para durar,{' '}
            <span className="mktg-gradient-text">não para impressionar</span>
          </h2>
        </div>

        {/* Trust cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {trust.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="group flex gap-4 bg-white border border-slate-100
                hover:border-indigo-200/50 rounded-2xl p-6
                shadow-[0_1px_4px_rgba(0,0,0,0.04)]
                hover:shadow-[0_8px_28px_rgba(79,70,229,0.07)]
                transition-all duration-300"
            >
              <div className="w-10 h-10 bg-indigo-50 border border-indigo-200/60 rounded-xl
                flex items-center justify-center flex-shrink-0 mt-0.5
                group-hover:bg-indigo-100 group-hover:border-indigo-200 transition-all">
                <Icon className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-slate-900 mb-1.5">{title}</h3>
                <p className="text-[13px] text-slate-500 leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
