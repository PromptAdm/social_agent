'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { billingService } from '@/services/billingService'
import { cn } from '@/lib/utils/cn'

/* ── Password strength ──────────────────────────────────────────────────────── */

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8)          score++
  if (/[A-Z]/.test(pw))        score++
  if (/[a-z]/.test(pw))        score++
  if (/[0-9]/.test(pw))        score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const levels = [
    { score: 1, label: 'Muito fraca', color: 'bg-red-400'     },
    { score: 2, label: 'Fraca',       color: 'bg-orange-400'  },
    { score: 3, label: 'Razoável',    color: 'bg-amber-400'   },
    { score: 4, label: 'Boa',         color: 'bg-lime-500'    },
    { score: 5, label: 'Forte',       color: 'bg-emerald-500' },
  ]
  return levels[Math.min(score, 5) - 1] ?? { score: 0, label: '', color: '' }
}

const REQUIREMENTS = [
  { label: 'Mínimo 8 caracteres', test: (pw: string) => pw.length >= 8 },
  { label: 'Letra maiúscula',     test: (pw: string) => /[A-Z]/.test(pw) },
  { label: 'Letra minúscula',     test: (pw: string) => /[a-z]/.test(pw) },
  { label: 'Número',              test: (pw: string) => /[0-9]/.test(pw) },
]

/* ── RegisterForm ───────────────────────────────────────────────────────────── */

const VALID_PLANS = new Set(['starter', 'professional', 'premium'])

function RegisterForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const setAuth      = useAuthStore((s) => s.setAuth)

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
      const regRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'}/auth/register`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
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

      const loginRes = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      })

      if (!loginRes.ok) {
        router.replace('/login')
        return
      }

      const { access_token, user } = await loginRes.json()
      if (user && access_token) {
        setAuth(user, access_token)
      } else {
        useAuthStore.getState().setLoading(false)
      }

      // If user arrived from a plan CTA, start checkout immediately
      const plan = searchParams.get('plan')
      if (plan && VALID_PLANS.has(plan)) {
        console.log('[register] post-register checkout — plan:', plan)
        try {
          const checkout = await billingService.createCheckoutSession({
            plan_code:                 plan,
            billing_cycle:             'monthly',
            payment_method_preference: 'card',
          })
          console.log('[register] checkout_url:', checkout.checkout_url)
          window.location.href = checkout.checkout_url
          return
        } catch (checkoutErr: any) {
          // parseApiError in the Axios interceptor rejects with a string — use it directly.
          console.error('[register] checkout failed after register (raw):', checkoutErr)
          const message = typeof checkoutErr === 'string'
            ? checkoutErr
            : (checkoutErr?.response?.data?.detail ?? checkoutErr?.message ?? null)
          console.error('[register] checkout error message:', message)
          setError(
            message
              ? `Erro ao iniciar pagamento: ${message}`
              : 'Conta criada! Acesse o painel e vá em Billing para assinar um plano.',
          )
          setLoading(false)
          return
        }
      }

      router.replace('/overview')
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
      {/* Split card — panels mirrored from login */}
      <div className="flex flex-col md:flex-row-reverse rounded-2xl overflow-hidden
        shadow-[0_32px_96px_rgba(0,0,0,0.60),0_0_0_1px_rgba(255,255,255,0.04)]">

        {/* ── Right (visually): brand panel ───────────────────────────────── */}
        <div className="md:w-[320px] flex-shrink-0 relative flex flex-col bg-[#0F1016]
          p-7 md:p-10 overflow-hidden">

          {/* Ambient glow */}
          <div
            className="absolute bottom-0 right-0 w-full h-[340px] pointer-events-none"
            aria-hidden="true"
            style={{
              background:
                'radial-gradient(ellipse 80% 60% at 80% 100%, rgba(99,102,241,0.13) 0%, transparent 65%)',
            }}
          />
          <div
            className="absolute top-0 left-0 w-[200px] h-[200px] pointer-events-none"
            aria-hidden="true"
            style={{
              background:
                'radial-gradient(circle at 0% 0%, rgba(99,102,241,0.07) 0%, transparent 65%)',
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
                Comece hoje
              </p>
              <h2 className="text-[22px] font-bold text-slate-100 leading-[1.22] tracking-[-0.02em] mb-4">
                7 dias grátis, sem cartão.
              </h2>
              <p className="text-[13.5px] text-slate-500 leading-relaxed mb-8">
                Crie sua conta em menos de 2 minutos e veja como é ter seu conteúdo organizado com IA.
              </p>

              <div className="space-y-2.5">
                {[
                  'Sem cartão de crédito',
                  'Cancele quando quiser',
                  'Suporte em português',
                ].map((t) => (
                  <div key={t} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/70 flex-shrink-0" />
                    <span className="text-[12.5px] text-slate-500">{t}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-white/[0.07] pt-7 mt-8">
              <p className="text-[12px] text-slate-600 mb-3">
                Já tem uma conta?
              </p>
              <Link
                href="/login"
                className="group inline-flex items-center gap-1.5
                  text-[13px] font-semibold text-slate-400
                  hover:text-white transition-colors duration-200"
              >
                Entrar na minha conta
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-200" />
              </Link>
            </div>
          </div>

          {/* Mobile: brief tagline */}
          <p className="relative z-10 md:hidden text-[13px] text-slate-500 mt-1">
            Crie sua conta Nezora.
          </p>
        </div>

        {/* ── Left (visually): form panel ─────────────────────────────────── */}
        <div className="flex-1 bg-[#F7F7F9] flex flex-col justify-center p-7 md:p-10 lg:p-12">
          <div className="max-w-[340px] w-full mx-auto">

            <div className="mb-7">
              <h1 className="text-[22px] font-bold text-slate-900 tracking-tight mb-1.5">
                Criar conta
              </h1>
              <p className="text-[13.5px] text-slate-500">
                Comece gratuitamente — 7 dias de trial incluídos.
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

              {/* Full name */}
              <div>
                <label className="block text-[10.5px] font-bold uppercase tracking-[0.08em] text-slate-400 mb-1.5">
                  Nome completo{' '}
                  <span className="normal-case font-normal text-slate-400/70">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome"
                  className="input h-10"
                  autoComplete="name"
                  autoFocus
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-[10.5px] font-bold uppercase tracking-[0.08em] text-slate-400 mb-1.5">
                  E-mail <span className="text-red-400 normal-case font-normal">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="input h-10"
                  autoComplete="email"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-[10.5px] font-bold uppercase tracking-[0.08em] text-slate-400 mb-1.5">
                  Senha <span className="text-red-400 normal-case font-normal">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPwFocused(true)}
                    onBlur={() => setPwFocused(false)}
                    placeholder="Crie uma senha forte"
                    className="input h-10 pr-10"
                    autoComplete="new-password"
                    required
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

                {/* Strength indicator */}
                {password && (
                  <div className="mt-2.5 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-[3px] bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all duration-300', strength.color)}
                          style={{ width: `${(strength.score / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 w-16 text-right">{strength.label}</span>
                    </div>

                    {(pwFocused || strength.score < 3) && (
                      <div className="grid grid-cols-2 gap-1">
                        {REQUIREMENTS.map((req) => {
                          const met = req.test(password)
                          return (
                            <div key={req.label} className="flex items-center gap-1.5">
                              <CheckCircle2
                                className={cn(
                                  'w-3 h-3 flex-shrink-0 transition-colors',
                                  met ? 'text-emerald-500' : 'text-slate-300',
                                )}
                              />
                              <span className={cn(
                                'text-[10px] transition-colors',
                                met ? 'text-slate-500' : 'text-slate-400',
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
                    Criando conta...
                  </>
                ) : 'Criar conta grátis'}
              </button>
            </form>

            {/* Mobile-only link to login */}
            <p className="md:hidden mt-5 text-center text-[13px] text-slate-500">
              Já tem conta?{' '}
              <Link
                href="/login"
                className="font-semibold text-slate-700 hover:text-slate-900 transition-colors"
              >
                Entrar
              </Link>
            </p>

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

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}
