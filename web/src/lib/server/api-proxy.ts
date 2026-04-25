/**
 * api-proxy.ts — Server-side helper for Next.js Route Handlers → FastAPI.
 *
 * Centralises:
 *  - Backend URL resolution and validation (fails clearly if env var is absent)
 *  - Content-Type guard before .json() (never crashes on "Not Found" HTML)
 *  - Timeout + network error handling
 *  - Safe logging (endpoint path only — no passwords, tokens or cookies)
 *
 * Usage:
 *   const result = await backendFetch('/auth/login', { method: 'POST', body: ... })
 *   if (!result.ok) return NextResponse.json(result.data, { status: result.status })
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type ProxySuccess<T> = { ok: true;  status: number; data: T }
export type ProxyError      = { ok: false; status: number; data: { detail: string } }
export type ProxyResult<T>  = ProxySuccess<T> | ProxyError

// ── URL resolution ────────────────────────────────────────────────────────────

/**
 * Returns the configured backend base URL, stripped of trailing slashes.
 *
 * - If NEXT_PUBLIC_API_URL is set: uses it (both dev and prod).
 * - If missing in production: returns null → caller returns 503.
 * - If missing in development: falls back to http://127.0.0.1:8000/api/v1.
 */
export function resolveApiUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim()
  if (raw) return raw.replace(/\/+$/, '')

  if (process.env.NODE_ENV === 'production') {
    console.error('[api-proxy] NEXT_PUBLIC_API_URL is not set. Configure it in Vercel → Settings → Environment Variables.')
    return null
  }

  return 'http://127.0.0.1:8000/api/v1'
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────

/**
 * Fetch a FastAPI endpoint and return a typed result — never throws.
 *
 * @param endpoint  Path relative to the base URL, e.g. '/auth/login'
 * @param init      Standard RequestInit plus optional timeoutMs (default 10 s)
 */
export async function backendFetch<T = unknown>(
  endpoint: string,
  init: Omit<RequestInit, 'signal'> & { timeoutMs?: number } = {},
): Promise<ProxyResult<T>> {
  const base = resolveApiUrl()

  if (!base) {
    return {
      ok:     false,
      status: 503,
      data:   { detail: 'NEXT_PUBLIC_API_URL não configurada no Vercel. Acesse Settings → Environment Variables e adicione a variável.' },
    }
  }

  const { timeoutMs = 10_000, ...fetchInit } = init
  const url    = `${base}${endpoint}`
  const method = (fetchInit.method ?? 'GET').toUpperCase()

  // Safe log: path only — no body, no tokens
  console.log(`[api-proxy] ${method} ${url}`)

  let res: Response
  try {
    res = await fetch(url, { ...fetchInit, signal: AbortSignal.timeout(timeoutMs) })
  } catch (err) {
    const isTimeout = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')
    console.error(`[api-proxy] ✗ ${method} ${url} —`, isTimeout ? `timeout after ${timeoutMs}ms` : String(err))
    return {
      ok:     false,
      status: 502,
      data:   {
        detail: isTimeout
          ? 'O servidor demorou demais para responder. Tente novamente em instantes.'
          : 'Não foi possível conectar ao servidor de autenticação.',
      },
    }
  }

  // Guard: only parse JSON when Content-Type says so
  const ct = res.headers.get('content-type') ?? ''
  if (!ct.includes('application/json')) {
    const body = (await res.text()).slice(0, 300).trim()
    console.error(`[api-proxy] ✗ ${method} ${url} → ${res.status} non-JSON — body: ${body}`)
    return {
      ok:     false,
      status: res.status >= 400 ? res.status : 502,
      data:   { detail: `O backend retornou ${res.status} sem JSON. Verifique se o serviço está no ar.` },
    }
  }

  let data: T
  try {
    data = await res.json()
  } catch (parseErr) {
    console.error(`[api-proxy] ✗ ${method} ${url} → ${res.status} JSON parse failed:`, parseErr)
    return {
      ok:     false,
      status: 502,
      data:   { detail: 'Resposta do servidor corrompida.' },
    }
  }

  console.log(`[api-proxy] ✓ ${method} ${url} → ${res.status}`)

  if (!res.ok) {
    return { ok: false, status: res.status, data: data as { detail: string } }
  }

  return { ok: true, status: res.status, data }
}

// ── Cookie config helper ──────────────────────────────────────────────────────

export const REFRESH_COOKIE = 'sa_refresh_token'

export const refreshCookieOptions = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path:     '/',
  maxAge:   60 * 60 * 24 * 30,  // 30 days
}

export const expireRefreshCookie = {
  ...refreshCookieOptions,
  maxAge: 0,
}
