'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Hexagon, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils/cn'

// ── Password strength indicator ────────────────────────────────────────────────

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8)             score++
  if (/[A-Z]/.test(pw))           score++
  if (/[a-z]/.test(pw))           score++
  if (/[0-9]/.test(pw))           score++
  if (/[^A-Za-z0-9]/.test(pw))    score++
  const levels = [
    { score: 1, label: 'Muito fraca', color: 'bg-red-500'    },
    { score: 2, label: 'Fraca',       color: 'bg-orange-500' },
    { score: 3, label: 'Razoável',    color: 'bg-amber-400'  },
    { score: 4, label: 'Boa',         color: 'bg-lime-500'   },
    { score: 5, label: 'Forte',       color: 'bg-emerald-500'},
  ]
  return levels[Math.min(score, 5) - 1] ?? { score: 0, label: '', color: '' }
}

const REQUIREMENTS = [
  { label: 'Mínimo 8 caracteres',       test: (pw: string) => pw.length >= 8 },
  { label: 'Letra maiúscula',            test: (pw: string) => /[A-Z]/.test(pw) },
  { label: 'Letra minúscula',            test: (pw: string) => /[a-z]/.test(pw) },
  { label: 'Número',                     test: (pw: string) => /[0-9]/.test(pw) },
]

// ── RegisterForm ───────────────────────────────────────────────────────────────

function RegisterForm() {
  const router  = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [fullName,     setFullName]     = useState('')
  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const [pwFocused,    setPwFocused]    = useState(false)

  const strength = passwordStrength(password)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Preencha e-mail e senha.')
      return
    }

    setLoading(true)
    try {
      // 1. Register
      const regRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'}/auth/register`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            full_name: fullName.trim() || undefined,
            password,
          }),
        },
      )

      const regData = await regRes.json()

      if (!regRes.ok) {
        if (regRes.status === 409) {
          setError('E-mail já cadastrado. Tente fazer login.')
          return
        }
        if (Array.isArray(regData?.detail)) {
          setError(regData.detail.map((d: any) => d.msg).join(' | '))
        } else {
          setError(regData?.detail ?? 'Erro ao criar conta.')
        }
        return
      }

      // 2. Auto-login via Next.js Route Handler
      const loginRes = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!loginRes.ok) {
        // Registration succeeded but login failed — redirect to login
        router.replace('/login')
        return
      }

      const { access_token, user } = await loginRes.json()
      if (user) setAuth(user, access_token)
      router.replace('/overview')
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-[420px] animate-fade-in">
      {/* Logo */}
      <div className="flex items-center gap-2.5 justify-center mb-8">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
          <Hexagon className="w-5 h-5 text-white fill-white/20" />
        </div>
        <span className="text-lg font-semibold text-slate-100 tracking-tight">
          Social Agent
        </span>
      </div>

      {/* Card */}
      <div className="bg-[#111118] border border-[#27273A] rounded-xl p-8 shadow-2xl">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-slate-100">Criar conta</h1>
          <p className="mt-1 text-sm text-slate-500">
            Comece grátis — sem cartão de crédito.
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2.5 px-3 py-2.5 bg-red-950/60 border border-red-900/40 rounded-md">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full name */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
              Nome completo <span className="normal-case text-slate-600">(opcional)</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome"
              className="input"
              autoComplete="name"
              autoFocus
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
              E-mail <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="input"
              autoComplete="email"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
              Senha <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setPwFocused(true)}
                onBlur={() => setPwFocused(false)}
                placeholder="Crie uma senha forte"
                className="input pr-10"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Strength bar */}
            {password && (
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-[#1E1E2A] rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-300', strength.color)}
                      style={{ width: `${(strength.score / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500">{strength.label}</span>
                </div>

                {/* Requirements */}
                {(pwFocused || strength.score < 3) && (
                  <div className="grid grid-cols-2 gap-1">
                    {REQUIREMENTS.map((req) => {
                      const met = req.test(password)
                      return (
                        <div key={req.label} className="flex items-center gap-1.5">
                          <CheckCircle2
                            className={cn(
                              'w-3 h-3 flex-shrink-0',
                              met ? 'text-emerald-500' : 'text-slate-700',
                            )}
                          />
                          <span className={cn(
                            'text-[10px]',
                            met ? 'text-slate-400' : 'text-slate-600',
                          )}>
                            {req.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors mt-2 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Criando conta…
              </>
            ) : 'Criar conta'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          Já tem uma conta?{' '}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
            Entrar
          </Link>
        </p>
      </div>

      <p className="text-center text-xs text-slate-700 mt-6">
        © 2026 Social Agent · Todos os direitos reservados
      </p>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}
