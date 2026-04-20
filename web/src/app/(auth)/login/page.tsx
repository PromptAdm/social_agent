'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'

/* ─────────────────────────────────────────────────────────────────────────── */

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
          setError(data.detail.map((item: any) => item.msg).join(' | '))
        } else if (typeof data?.detail === 'string') {
          setError(data.detail)
        } else {
          setError('Credenciais inválidas.')
        }
        return
      }

      const { access_token, user } = data
      if (user) setAuth(user, access_token)

      const from = searchParams.get('from') ?? '/overview'
      router.replace(from)
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-[820px]"
    >
      {/* Split card */}
      <div className="flex flex-col md:flex-row rounded-2xl overflow-hidden
        shadow-[0_32px_96px_rgba(0,0,0,0.60),0_0_0_1px_rgba(255,255,255,0.04)]">

        {/* ── Left: brand panel ───────────────────────────────────────────── */}
        <div className="md:w-[320px] flex-shrink-0 relative flex flex-col bg-[#0F1016]
          p-7 md:p-10 overflow-hidden">

          {/* Ambient glow */}
          <div
            className="absolute bottom-0 left-0 w-full h-[340px] pointer-events-none"
            aria-hidden="true"
            style={{
              background:
                'radial-gradient(ellipse 80% 60% at 20% 100%, rgba(99,102,241,0.13) 0%, transparent 65%)',
            }}
          />
          <div
            className="absolute top-0 right-0 w-[200px] h-[200px] pointer-events-none"
            aria-hidden="true"
            style={{
              background:
                'radial-gradient(circle at 100% 0%, rgba(99,102,241,0.07) 0%, transparent 65%)',
            }}
          />

          {/* Logo — links to landing */}
          <Link href="/" className="relative z-10 inline-flex items-center gap-2.5 group mb-8">
            <div className="relative w-8 h-8 flex-shrink-0">
              <Image
                src="/videos/logo.png"
                alt="Nezora"
                fill
                sizes="32px"
                className="object-contain rounded-lg"
              />
            </div>
            <span className="text-[15px] font-semibold text-slate-100 tracking-tight group-hover:text-white transition-colors">
              Nezora
            </span>
          </Link>

          {/* Copy — desktop only */}
          <div className="relative z-10 hidden md:flex flex-col flex-1 justify-between">
            <div>
              <p className="text-[10.5px] font-bold tracking-[0.12em] uppercase text-slate-600 mb-4">
                Bem-vindo de volta
              </p>
              <h2 className="text-[22px] font-bold text-slate-100 leading-[1.22] tracking-[-0.02em] mb-4">
                Sua operação de marketing, com IA.
              </h2>
              <p className="text-[13.5px] text-slate-500 leading-relaxed">
                Organize, crie e publique conteúdo de forma inteligente — sem esforço.
              </p>
            </div>

            <div className="border-t border-white/[0.07] pt-7 mt-10">
              <p className="text-[12px] text-slate-600 mb-3">
                Não tem uma conta?
              </p>
              <Link
                href="/register"
                className="group inline-flex items-center gap-1.5
                  text-[13px] font-semibold text-slate-400
                  hover:text-white transition-colors duration-200"
              >
                Criar conta grátis
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-200" />
              </Link>
            </div>
          </div>

          {/* Mobile: brief tagline */}
          <p className="relative z-10 md:hidden text-[13px] text-slate-500 mt-1">
            Acesse sua conta Nezora.
          </p>
        </div>

        {/* ── Right: form panel ───────────────────────────────────────────── */}
        <div className="flex-1 bg-[#F7F7F9] flex flex-col justify-center p-7 md:p-10 lg:p-12">
          <div className="max-w-[340px] w-full mx-auto">

            <div className="mb-7">
              <h1 className="text-[22px] font-bold text-slate-900 tracking-tight mb-1.5">
                Acesse sua conta
              </h1>
              <p className="text-[13.5px] text-slate-500">
                Insira suas credenciais para continuar.
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div className="mb-5 flex items-start gap-2.5 px-3.5 py-3
                bg-red-50 border border-red-200/80 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-px" />
                <p className="text-[13px] text-red-600 leading-snug">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Email */}
              <div>
                <label className="block text-[10.5px] font-bold uppercase tracking-[0.08em] text-slate-400 mb-1.5">
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="input h-10"
                  autoComplete="email"
                  autoFocus
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-[10.5px] font-bold uppercase tracking-[0.08em] text-slate-400 mb-1.5">
                  Senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input h-10 pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2
                      text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword
                      ? <EyeOff className="w-4 h-4" />
                      : <Eye className="w-4 h-4" />
                    }
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 mt-1 rounded-xl
                  bg-[#18181B] hover:bg-[#27272A]
                  disabled:opacity-50 disabled:cursor-not-allowed
                  text-white text-[14px] font-semibold
                  shadow-[0_2px_8px_rgba(0,0,0,0.18)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.24)]
                  transition-all duration-200
                  flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Entrando...
                  </>
                ) : 'Entrar'}
              </button>
            </form>

            <div className="mt-5 flex flex-col items-center gap-2.5">
              <button className="text-[12.5px] text-slate-400 hover:text-slate-600 transition-colors">
                Esqueci minha senha
              </button>
              {/* Mobile-only — on desktop it's on the left panel */}
              <p className="md:hidden text-[13px] text-slate-500">
                Não tem conta?{' '}
                <Link
                  href="/register"
                  className="font-semibold text-slate-700 hover:text-slate-900 transition-colors"
                >
                  Criar conta
                </Link>
              </p>
            </div>

          </div>
        </div>

      </div>

      {/* Footer */}
      <p className="text-center text-[11px] text-slate-700 mt-5">
        © {new Date().getFullYear()} Nezora · Todos os direitos reservados
      </p>
    </motion.div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
