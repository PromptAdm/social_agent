export default function SettingsPage() {
  return (
    <div className="p-8 max-w-[700px]">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-100">Configurações</h1>
        <p className="text-sm text-slate-500 mt-0.5">Gerencie sua conta e preferências.</p>
      </div>
      <div className="card p-6 space-y-4">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Nome</p>
          <p className="text-sm text-slate-100">Angel M.</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">E-mail</p>
          <p className="text-sm text-slate-100">angel@acmecorp.com</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Função</p>
          <p className="text-sm text-slate-100">Admin</p>
        </div>
        <div className="pt-3 border-t border-[#1E1E2A]">
          <button className="btn-secondary text-sm">Alterar senha</button>
        </div>
      </div>
    </div>
  )
}
