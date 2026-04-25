import { NextRequest, NextResponse } from 'next/server'
import {
  backendFetch,
  REFRESH_COOKIE,
  refreshCookieOptions,
  expireRefreshCookie,
} from '@/lib/server/api-proxy'

/**
 * POST /api/auth/refresh
 *
 * Lê o refresh_token do cookie httpOnly, chama FastAPI, renova o cookie
 * e retorna { access_token } ao browser.
 */
export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value

  if (!refreshToken) {
    return NextResponse.json({ message: 'Sessão expirada.' }, { status: 401 })
  }

  const result = await backendFetch<{
    access_token:   string
    refresh_token?: string
  }>('/auth/refresh', {
    method:    'POST',
    headers:   { 'Content-Type': 'application/json' },
    body:      JSON.stringify({ refresh_token: refreshToken }),
    timeoutMs: 5_000,
  })

  if (!result.ok) {
    const res = NextResponse.json(
      { message: result.data.detail ?? 'Sessão expirada.' },
      { status: 401 },
    )
    res.cookies.set(REFRESH_COOKIE, '', expireRefreshCookie)
    return res
  }

  const { access_token, refresh_token: newRefresh } = result.data
  const res = NextResponse.json({ access_token })

  // Renova o cookie se a API retornou um novo refresh_token (rotation)
  if (newRefresh) {
    res.cookies.set(REFRESH_COOKIE, newRefresh, refreshCookieOptions)
  }

  return res
}
