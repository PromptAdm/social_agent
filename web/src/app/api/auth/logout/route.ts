import { NextRequest, NextResponse } from 'next/server'
import {
  backendFetch,
  REFRESH_COOKIE,
  expireRefreshCookie,
} from '@/lib/server/api-proxy'

/**
 * POST /api/auth/logout
 *
 * Notifica o FastAPI para revogar o token (best-effort) e limpa o cookie.
 * O logout local sempre ocorre, mesmo que o backend esteja fora do ar.
 */
export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value

  if (refreshToken) {
    // Fire-and-forget — erro no backend não bloqueia o logout local
    backendFetch('/auth/logout', {
      method:    'POST',
      headers:   { 'Content-Type': 'application/json' },
      body:      JSON.stringify({ refresh_token: refreshToken }),
      timeoutMs: 4_000,
    }).catch(() => {/* silencioso — logout local prossegue */})
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(REFRESH_COOKIE, '', expireRefreshCookie)
  return res
}
