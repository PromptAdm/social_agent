import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

/**
 * POST /api/auth/login
 *
 * Recebe { username, password }, chama FastAPI, guarda refresh_token em
 * cookie httpOnly e devolve { access_token, user } ao browser.
 *
 * FastAPI espera form-data (OAuth2PasswordRequestForm), não JSON.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Monta form-data (FastAPI OAuth2PasswordRequestForm)
    const form = new URLSearchParams()
    form.append('username', body.email ?? body.username ?? '')
    form.append('password', body.password ?? '')

    const apiRes = await fetch(`${API_URL}/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    form.toString(),
    })

    const data = await apiRes.json()

    if (!apiRes.ok) {
      return NextResponse.json(
        { message: data.detail ?? 'Credenciais inválidas.' },
        { status: apiRes.status }
      )
    }

    const { access_token, refresh_token } = data

    // Busca dados do usuário com o access_token recém-obtido
    const meRes = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${access_token}` },
    })
    const user = meRes.ok ? await meRes.json() : null

    const response = NextResponse.json({ access_token, user })

    // Seta refresh_token em cookie httpOnly — nunca acessível pelo JS do browser
    response.cookies.set('sa_refresh_token', refresh_token, {
      httpOnly:  true,
      secure:    process.env.NODE_ENV === 'production',
      sameSite:  'strict',
      path:      '/api/auth',
      maxAge:    60 * 60 * 24 * 30, // 30 dias
    })

    return response
  } catch (err) {
    console.error('[auth/login]', err)
    return NextResponse.json({ message: 'Erro ao conectar com o servidor.' }, { status: 502 })
  }
}
