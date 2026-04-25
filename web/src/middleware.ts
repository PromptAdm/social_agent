import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Always open — no auth required, no redirect even when authenticated
const OPEN_PATHS = ['/', '/privacy', '/data-deletion']

// Open to anonymous users; authenticated users are bounced to the dashboard
const AUTH_REDIRECT_PATHS = ['/login', '/register']

// Paths the middleware must not intercept
const STATIC_PREFIXES = ['/_next', '/favicon', '/api', '/videos', '/images']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip static assets and API route handlers
  if (STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  const isOpen           = OPEN_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
  const isAuthRedirect   = AUTH_REDIRECT_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
  const isPublic         = isOpen || isAuthRedirect

  const hasRefreshToken  = request.cookies.has('sa_refresh_token')

  console.log(`[middleware] ${pathname} | open=${isOpen} | authRedirect=${isAuthRedirect} | hasToken=${hasRefreshToken}`)

  // Authenticated user on /login or /register → send to dashboard
  if (isAuthRedirect && hasRefreshToken) {
    console.log('[middleware] authenticated on auth-only route → /overview')
    return NextResponse.redirect(new URL('/overview', request.url))
  }

  // Unauthenticated user on a protected route → redirect to /login
  if (!isPublic && !hasRefreshToken) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    console.log(`[middleware] no token on protected route → /login?from=${pathname}`)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Run on every path except Next.js static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
