import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1'

/**
 * POST /api/auth/login
 *
 * Recebe { email, password }, chama FastAPI via JSON, guarda refresh_token em
 * cookie httpOnly e devolve { access_token, user } ao browser.
 *
 * FastAPI /auth/login aceita JSON (LoginRequest) e retorna TokenResponse
 * com access_token, refresh_token e user embutido — sem chamada extra ao /me.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const apiRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: body.email ?? '',
        password: body.password ?? '',
      }),
    })

    const data = await apiRes.json()

    if (!apiRes.ok) {
      return NextResponse.json(
        { detail: data.detail ?? 'Credenciais inválidas.' },
        { status: apiRes.status },
      )
    }

    const { access_token, refresh_token, user } = data

    const response = NextResponse.json({ access_token, user })

    response.cookies.set('sa_refresh_token', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })

    return response
  } catch (err) {
    console.error('[auth/login]', err)
    return NextResponse.json(
      { detail: 'Erro ao conectar com o servidor.' },
      { status: 502 },
    )
  }
}