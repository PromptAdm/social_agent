import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Solicitação de Exclusão de Dados — Nezora',
  robots: { index: false, follow: false },
}

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Minimal header */}
      <header className="border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-2">
          <span className="text-[18px] font-bold text-slate-900 tracking-tight">Nezora</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-16">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">
          Solicitação de Exclusão de Dados
        </h1>

        <div className="prose prose-slate max-w-none space-y-5 text-[15px] leading-relaxed text-slate-700">
          <p>
            Para solicitar a exclusão de seus dados vinculados ao <strong>Nezora</strong>,
            entre em contato pelo e-mail abaixo:
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-xl px-6 py-5 space-y-3 text-[14px]">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1">
              <span className="font-semibold text-slate-500 w-24 flex-shrink-0">E-mail</span>
              <a
                href="mailto:prompt.admia@gmail.com?subject=Solicitação de Exclusão de Dados Meta"
                className="text-violet-700 font-medium hover:underline break-all"
              >
                prompt.admia@gmail.com
              </a>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1">
              <span className="font-semibold text-slate-500 w-24 flex-shrink-0">Assunto</span>
              <span className="text-slate-700">Solicitação de Exclusão de Dados Meta</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1">
              <span className="font-semibold text-slate-500 w-24 flex-shrink-0">Prazo</span>
              <span className="text-slate-700">Responderemos em até <strong>7 dias úteis</strong>.</span>
            </div>
          </div>

          <p className="text-slate-500 text-[13px]">
            Após o recebimento da solicitação, seus dados pessoais e vinculações com contas
            de redes sociais serão removidos dos nossos sistemas dentro do prazo informado,
            conforme a Lei Geral de Proteção de Dados (LGPD) e as políticas da plataforma Meta.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100">
        <div className="max-w-3xl mx-auto px-6 py-4 text-[12px] text-slate-400">
          © {new Date().getFullYear()} Nezora. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  )
}
