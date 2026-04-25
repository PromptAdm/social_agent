import { NextRequest, NextResponse } from 'next/server'
import {
  backendFetch,
  REFRESH_COOKIE,
  refreshCookieOptions,
} from '@/lib/server/api-proxy'

/**
 * POST /api/auth/login
 *
 * Proxy seguro para FastAPI POST /auth/login.
 * Salva o refresh_token em cookie httpOnly e retorna { access_token, user }.
 *
 * Endpoint final em produção:
 *   https://social-agent-api.onrender.com/api/v1/auth/login
 */
export async function POST(req: NextRequest) {
  let email = '', password = ''
  try {
    const body = await req.json()
    email    = String(body.email    ?? '')
    password = String(body.password ?? '')
  } catch {
    return NextResponse.json({ detail: 'Requisição inválida.' }, { status: 400 })
  }

  if (!email || !password) {
    return NextResponse.json({ detail: 'E-mail e senha são obrigatórios.' }, { status: 422 })
  }

  const result = await backendFetch<{
    access_token:  string
    refresh_token: string
    user:          unknown
  }>('/auth/login', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, password }),
  })

  if (!result.ok) {
    return NextResponse.json(result.data, { status: result.status })
  }

  const { access_token, refresh_token, user } = result.data

  const response = NextResponse.json({ access_token, user })
  response.cookies.set(REFRESH_COOKIE, refresh_token, refreshCookieOptions)
  return response
}
