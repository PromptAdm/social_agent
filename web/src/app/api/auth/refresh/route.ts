import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

/**
 * POST /api/auth/refresh
 *
 * Lê o refresh_token do cookie httpOnly, envia para FastAPI,
 * atualiza o cookie e devolve { access_token } ao browser.
 */
export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get('sa_refresh_token')?.value

    if (!refreshToken) {
      return NextResponse.json({ message: 'Sessão expirada.' }, { status: 401 })
    }

    const apiRes = await fetch(`${API_URL}/auth/refresh`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refresh_token: refreshToken }),
    })

    const data = await apiRes.json()

    if (!apiRes.ok) {
      // Refresh inválido/expirado — limpa o cookie
      const response = NextResponse.json(
        { message: data.detail ?? 'Sessão expirada.' },
        { status: 401 }
      )
      response.cookies.delete('sa_refresh_token')
      return response
    }

    const { access_token, refresh_token: newRefreshToken } = data

    const response = NextResponse.json({ access_token })

    // Renova o refresh_token se a API devolveu um novo (rotation)
    if (newRefreshToken) {
      response.cookies.set('sa_refresh_token', newRefreshToken, {
        httpOnly: true,
        secure:   process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path:     '/',   // must match the login cookie path so middleware can read it
        maxAge:   60 * 60 * 24 * 30,
      })
    }

    return response
  } catch (err) {
    console.error('[auth/refresh]', err)
    return NextResponse.json({ message: 'Erro ao renovar sessão.' }, { status: 502 })
  }
}
