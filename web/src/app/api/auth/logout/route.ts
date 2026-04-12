import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

/**
 * POST /api/auth/logout
 *
 * Chama o endpoint de logout do FastAPI (melhor esforço),
 * limpa o cookie httpOnly e responde 200.
 */
export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get('sa_refresh_token')?.value

  // Notifica o backend para invalidar o refresh token (ignora erros)
  if (refreshToken) {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ refresh_token: refreshToken }),
      })
    } catch {
      // Logout local deve funcionar mesmo se o backend estiver fora
    }
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.delete('sa_refresh_token')
  return response
}
