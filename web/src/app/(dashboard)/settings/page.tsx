'use client'

import { useState, useEffect } from 'react'
import { User, Lock, Bell, Shield, Check, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { apiClient as api } from '@/lib/api/client'
import { cn } from '@/lib/utils/cn'

// ── Section component ──────────────────────────────────────────────────────────

function Section({ title, description, children }: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[240px_1fr] gap-8">
      <div>
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
        {description && (
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>
        )}
      </div>
      <div>{children}</div>
    </div>
  )
}

function Divider() {
  return <div className="border-t border-[#1E1E2A]" />
}

// ── Toast inline ──────────────────────────────────────────────────────────────

function InlineAlert({ type, message }: { type: 'success' | 'error'; message: string }) {
  return (
    <div className={cn(
      'flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm',
      type === 'success'
        ? 'bg-emerald-950/40 border border-emerald-900/30 text-emerald-400'
        : 'bg-red-950/40 border border-red-900/30 text-red-400',
    )}>
      {type === 'success'
        ? <Check className="w-4 h-4 flex-shrink-0" />
        : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
      {message}
    </div>
  )
}

// ── ProfileSection ─────────────────────────────────────────────────────────────

function ProfileSection() {
  const user    = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)

  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [loading,  setLoading]  = useState(false)
  const [status,   setStatus]   = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  // Sync when user changes (e.g. after hydration)
  useEffect(() => { setFullName(user?.full_name ?? '') }, [user])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setStatus(null)
    setLoading(true)
    try {
      const res = await api.patch('/auth/me', { full_name: fullName.trim() || null })
      setUser(res.data)
      setStatus({ type: 'success', msg: 'Perfil atualizado.' })
    } catch {
      setStatus({ type: 'error', msg: 'Erro ao salvar. Tente novamente.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Section
      title="Perfil"
      description="Informações básicas da sua conta."
    >
      <form onSubmit={handleSave} className="card p-5 space-y-4">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-bold text-white">
              {(user?.full_name ?? user?.email ?? 'U').charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-200">
              {user?.full_name ?? 'Sem nome'}
            </p>
            <p className="text-xs text-slate-500">{user?.email}</p>
            <span className="inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-600/15 border border-indigo-500/20 text-indigo-400 uppercase tracking-wide">
              {user?.role ?? 'editor'}
            </span>
          </div>
        </div>

        <Divider />

        <div className="space-y-3">
          {/* Full name */}
          <div>
            <label className="field-label block mb-1.5">Nome completo</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome"
              className="input"
            />
          </div>

          {/* Email — read-only */}
          <div>
            <label className="field-label block mb-1.5">E-mail</label>
            <input
              value={user?.email ?? ''}
              disabled
              className="input opacity-50 cursor-not-allowed"
            />
            <p className="text-[11px] text-slate-600 mt-1">
              O e-mail não pode ser alterado.
            </p>
          </div>
        </div>

        {status && <InlineAlert type={status.type} message={status.msg} />}

        <div className="flex justify-end">
          <button type="submit" disabled={loading} className="btn-primary min-w-[110px]">
            {loading
              ? <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Salvando…
                </span>
              : 'Salvar perfil'}
          </button>
        </div>
      </form>
    </Section>
  )
}

// ── ChangePasswordSection ──────────────────────────────────────────────────────

function ChangePasswordSection() {
  const [current,     setCurrent]     = useState('')
  const [next,        setNext]        = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNext,    setShowNext]    = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [status,      setStatus]      = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus(null)

    if (next.length < 8) {
      setStatus({ type: 'error', msg: 'A nova senha deve ter ao menos 8 caracteres.' })
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/change-password', {
        current_password: current,
        new_password:     next,
      })
      setStatus({ type: 'success', msg: 'Senha alterada com sucesso.' })
      setCurrent('')
      setNext('')
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      if (err?.response?.status === 400) {
        setStatus({ type: 'error', msg: 'Senha atual incorreta.' })
      } else if (err?.response?.status === 422) {
        setStatus({ type: 'error', msg: detail ?? 'Senha não atende aos requisitos.' })
      } else {
        setStatus({ type: 'error', msg: 'Erro ao alterar senha. Tente novamente.' })
      }
    } finally {
      setLoading(false)
    }
  }

  function PasswordInput({ value, onChange, placeholder, show, onToggle }: {
    value: string
    onChange: (v: string) => void
    placeholder: string
    show: boolean
    onToggle: () => void
  }) {
    return (
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="input pr-10"
          autoComplete="off"
          required
        />
        <button type="button" onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    )
  }

  return (
    <Section
      title="Senha"
      description="Use uma senha forte com letras, números e símbolos."
    >
      <form onSubmit={handleSubmit} className="card p-5 space-y-4">
        <div>
          <label className="field-label block mb-1.5">Senha atual</label>
          <PasswordInput
            value={current}
            onChange={setCurrent}
            placeholder="••••••••"
            show={showCurrent}
            onToggle={() => setShowCurrent(!showCurrent)}
          />
        </div>
        <div>
          <label className="field-label block mb-1.5">Nova senha</label>
          <PasswordInput
            value={next}
            onChange={setNext}
            placeholder="Mínimo 8 caracteres"
            show={showNext}
            onToggle={() => setShowNext(!showNext)}
          />
          {next && next.length < 8 && (
            <p className="text-[11px] text-amber-400 mt-1">
              A senha deve ter pelo menos 8 caracteres.
            </p>
          )}
        </div>

        {status && <InlineAlert type={status.type} message={status.msg} />}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || !current || !next}
            className="btn-primary min-w-[120px]"
          >
            {loading
              ? <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Alterando…
                </span>
              : 'Alterar senha'}
          </button>
        </div>
      </form>
    </Section>
  )
}

// ── DangerZoneSection ─────────────────────────────────────────────────────────

function DangerZoneSection() {
  return (
    <Section
      title="Zona de risco"
      description="Ações irreversíveis relacionadas à sua conta."
    >
      <div className="card border-red-900/30 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-200">Encerrar conta</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Todos os dados serão permanentemente removidos.
            </p>
          </div>
          <button
            className="btn-danger"
            onClick={() => alert('Entre em contato com o suporte para encerrar a conta.')}
          >
            Encerrar conta
          </button>
        </div>
      </div>
    </Section>
  )
}

// ── SettingsPage ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'profile',  label: 'Perfil',    icon: User   },
  { id: 'security', label: 'Segurança', icon: Lock   },
  { id: 'danger',   label: 'Conta',     icon: Shield },
]

export default function SettingsPage() {
  const [tab, setTab] = useState('profile')

  return (
    <div className="p-6 max-w-[860px]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-100">Configurações</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Gerencie sua conta e preferências.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#1E1E2A] mb-8">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium relative transition-colors',
              tab === t.id ? 'text-slate-100' : 'text-slate-500 hover:text-slate-300',
            )}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
            {tab === t.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-t" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-8">
        {tab === 'profile'  && <ProfileSection />}
        {tab === 'security' && <ChangePasswordSection />}
        {tab === 'danger'   && <DangerZoneSection />}
      </div>
    </div>
  )
}
