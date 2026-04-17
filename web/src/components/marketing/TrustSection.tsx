import { ShieldCheck, Lock, RefreshCw, Headphones } from 'lucide-react'

const stats = [
  { value: '100%',    label: 'Hospedado no Brasil',     sub: 'Dados sob a LGPD'           },
  { value: '7 dias',  label: 'Trial gratuito',           sub: 'Sem cartão de crédito'       },
  { value: 'Always',  label: 'Uptime monitorado',        sub: 'Infraestrutura redundante'   },
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
    <section id="trust" className="py-28 px-5 relative overflow-hidden">

      {/* Gradient divider top */}
      <div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent"
        aria-hidden="true"
      />

      <div className="max-w-5xl mx-auto">

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#1E1E2A] rounded-2xl overflow-hidden mb-20">
          {stats.map(({ value, label, sub }) => (
            <div key={label} className="bg-[#0F0F17] px-6 py-7 text-center">
              <p className="text-[30px] font-bold text-slate-100 mb-1 leading-none">{value}</p>
              <p className="text-[13px] font-semibold text-slate-300 mb-0.5">{label}</p>
              <p className="text-[11px] text-slate-600">{sub}</p>
            </div>
          ))}
        </div>

        {/* Trust points */}
        <div className="text-center mb-12">
          <span className="inline-block text-[11px] font-bold tracking-[0.12em] uppercase text-indigo-400 mb-4">
            Você pode confiar
          </span>
          <h2 className="text-[32px] sm:text-[38px] font-bold text-slate-100 leading-tight">
            Construído para durar,{' '}
            <span className="gradient-text">não para impressionar</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {trust.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-4 bg-[#0F0F17] border border-[#1E1E2A] rounded-2xl p-6">
              <div className="w-9 h-9 bg-indigo-600/12 border border-indigo-500/20 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-slate-200 mb-1.5">{title}</h3>
                <p className="text-[13px] text-slate-500 leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gradient divider bottom */}
      <div
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent"
        aria-hidden="true"
      />
    </section>
  )
}
