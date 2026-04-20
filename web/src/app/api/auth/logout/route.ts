import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

/**
 * POST /api/auth/logout
 *
 * Calls FastAPI to invalidate the refresh token on the backend (best-effort),
 * then FULLY clears the sa_refresh_token cookie.
 *
 * Critical: the cookie was set with path='/' so we must delete with path='/'
 * explicitly — response.cookies.delete() defaults to the request path
 * (/api/auth) which would leave the root-path cookie alive.
 */
export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get('sa_refresh_token')?.value

  console.log('[logout] refreshToken present:', !!refreshToken)

  // Notify backend to revoke the token (ignore errors — local logout must always succeed)
  if (refreshToken) {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ refresh_token: refreshToken }),
      })
      console.log('[logout] backend revoke called')
    } catch (err) {
      console.warn('[logout] backend revoke failed (ok, local logout continues):', err)
    }
  }

  const response = NextResponse.json({ ok: true })

  // Expire the cookie at path='/' — must match the path used by /api/auth/login
  response.cookies.set('sa_refresh_token', '', {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path:     '/',
    maxAge:   0,
  })

  console.log('[logout] cookie cleared')
  return response
}
