import { NextRequest, NextResponse } from 'next/server'
import { backendFetch } from '@/lib/server/api-proxy'

/**
 * POST /api/auth/register
 *
 * Proxy seguro para FastAPI POST /auth/register.
 * Não faz login automático — o frontend chama /api/auth/login após o registro.
 */
export async function POST(req: NextRequest) {
  let email = '', full_name = '', password = ''
  try {
    const body = await req.json()
    email     = String(body.email     ?? '')
    full_name = String(body.full_name ?? '')
    password  = String(body.password  ?? '')
  } catch {
    return NextResponse.json({ detail: 'Requisição inválida.' }, { status: 400 })
  }

  const result = await backendFetch('/auth/register', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, full_name, password }),
  })

  if (!result.ok) {
    return NextResponse.json(result.data, { status: result.status })
  }

  return NextResponse.json(result.data, { status: 201 })
}
