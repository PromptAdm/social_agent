import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Política de Privacidade — Nezora',
  robots: { index: false, follow: false },
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Minimal header */}
      <header className="border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <span className="text-[18px] font-bold text-slate-900 tracking-tight">Nezora</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-16 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Política de Privacidade</h1>
          <p className="text-[13px] text-slate-400">Última atualização: abril de 2025</p>
        </div>

        <p className="text-[15px] leading-relaxed text-slate-700">
          O <strong>Nezora</strong> respeita sua privacidade e utiliza os dados conectados às
          plataformas Meta apenas para permitir autenticação, gerenciamento de contas, publicação
          de conteúdos e funcionamento das integrações solicitadas pelo usuário.
        </p>

        <section className="space-y-3">
          <h2 className="text-[16px] font-semibold text-slate-900">Dados que podemos acessar</h2>
          <ul className="space-y-2 text-[14px] text-slate-700">
            {[
              'Nome e identificação pública do perfil',
              'Páginas conectadas',
              'Contas comerciais vinculadas',
              'Informações necessárias para publicação e gerenciamento de conteúdo',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-500 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <div className="bg-slate-50 border border-slate-200 rounded-xl px-6 py-5 text-[14px] text-slate-700 leading-relaxed">
          <p>
            <strong>Não vendemos dados pessoais.</strong> Os dados são usados somente para
            operação da plataforma Nezora e nunca são compartilhados com terceiros para
            fins comerciais.
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-[16px] font-semibold text-slate-900">Dúvidas ou solicitações</h2>
          <p className="text-[14px] text-slate-700">
            Para qualquer questão sobre privacidade ou solicitação de exclusão de dados,
            entre em contato pelo e-mail:
          </p>
          <a
            href="mailto:prompt.admia@gmail.com"
            className="inline-flex text-[14px] text-violet-700 font-medium hover:underline"
          >
            prompt.admia@gmail.com
          </a>
          <p className="text-[13px] text-slate-500">
            Respondemos em até 7 dias úteis.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100">
        <div className="max-w-3xl mx-auto px-6 py-4 flex flex-wrap items-center gap-4 text-[12px] text-slate-400">
          <span>© {new Date().getFullYear()} Nezora. Todos os direitos reservados.</span>
          <a href="/data-deletion" className="hover:text-slate-600 transition-colors">
            Exclusão de Dados
          </a>
        </div>
      </footer>
    </div>
  )
}
