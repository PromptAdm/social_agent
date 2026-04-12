'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Hexagon, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { parseApiError } from '@/lib/api/errors'

function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const setAuth      = useAuthStore((s) => s.setAuth)

  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Preencha todos os campos.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (Array.isArray(data?.detail)) {
        setError(data.detail.map((item: any) => item.msg).join(" | "));
      } else if (typeof data?.detail === "string") {
        setError(data.detail);
      } else {
        setError("Credenciais inválidas.");
}
        return
      }

      const { access_token, user } = data
      if (user) setAuth(user, access_token)

      const from = searchParams.get('from') ?? '/overview'
      router.replace(from)
    } catch (err: any) {
      const apiError = err?.response?.data || err;

if (Array.isArray(apiError?.detail)) {
  setError(apiError.detail.map((item: any) => item.msg).join(" | "));
} else if (typeof apiError?.detail === "string") {
  setError(apiError.detail);
} else if (typeof apiError?.message === "string") {
  setError(apiError.message);
} else {
  setError("Erro ao fazer login.");
}
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-[400px] animate-fade-in">
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
          <h1 className="text-xl font-semibold text-slate-100">Acesse sua conta</h1>
          <p className="mt-1 text-sm text-slate-500">
            Bem-vindo de volta — insira seus dados para continuar.
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2.5 px-3 py-2.5 bg-red-950/60 border border-red-900/40 rounded-md">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="input"
              autoComplete="email"
              autoFocus
            />
          </div>

          {/* Senha */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
              Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input pr-10"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
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
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button className="text-sm text-slate-500 hover:text-slate-400 transition-colors">
            Esqueci minha senha
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-slate-700 mt-6">
        © 2026 Social Agent · Todos os direitos reservados
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
