import Link from 'next/link'
import { Hexagon } from 'lucide-react'

const footerLinks = [
  {
    title: 'Produto',
    links: [
      { label: 'Funcionalidades', href: '#benefits' },
      { label: 'Preços',          href: '#plans' },
      { label: 'Por que Nezora',  href: '#why' },
    ],
  },
  {
    title: 'Planos',
    links: [
      { label: 'Starter — R$49',        href: '/register' },
      { label: 'Professional — R$99',   href: '/register' },
      { label: 'Premium — R$199',       href: '/register' },
    ],
  },
  {
    title: 'Conta',
    links: [
      { label: 'Entrar no sistema', href: '/login'    },
      { label: 'Criar conta',       href: '/register' },
      { label: 'Esqueci a senha',   href: '/login'    },
    ],
  },
  {
    title: 'Empresa',
    links: [
      { label: 'Contato',              href: 'mailto:contato@nezora.com.br' },
      { label: 'Termos de uso',        href: '#'                            },
      { label: 'Política de privacidade', href: '#'                         },
    ],
  },
]

export function MarketingFooter() {
  return (
    <footer className="bg-white border-t border-slate-200/70 px-6 pt-16 pb-10">
      <div className="max-w-5xl mx-auto">

        <div className="grid grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-8 mb-14">

          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-violet-600
                rounded-lg flex items-center justify-center flex-shrink-0
                shadow-md shadow-indigo-500/20">
                <Hexagon className="w-[15px] h-[15px] text-white" strokeWidth={2.5} />
              </div>
              <span className="text-[15px] font-bold text-slate-900 tracking-tight">Nezora</span>
            </Link>
            <p className="text-[13px] text-slate-500 leading-relaxed max-w-[220px]">
              Gestão de redes sociais com inteligência artificial para marcas que levam conteúdo a sério.
            </p>
            <p className="text-[12px] text-slate-400 mt-4">
              Feito no Brasil 🇧🇷
            </p>
          </div>

          {/* Nav columns */}
          {footerLinks.map(({ title, links }) => (
            <div key={title}>
              <h4 className="text-[10px] font-bold tracking-[0.1em] uppercase text-slate-400 mb-4">
                {title}
              </h4>
              <ul className="space-y-2.5">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-[13px] text-slate-500 hover:text-slate-900 transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-slate-200/70 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[12px] text-slate-400">
            © {new Date().getFullYear()} Nezora. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-4">
            <Link href="#" className="text-[12px] text-slate-400 hover:text-slate-700 transition-colors">
              Termos
            </Link>
            <Link href="#" className="text-[12px] text-slate-400 hover:text-slate-700 transition-colors">
              Privacidade
            </Link>
            <a
              href="mailto:contato@nezora.com.br"
              className="text-[12px] text-slate-400 hover:text-slate-700 transition-colors"
            >
              contato@nezora.com.br
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
