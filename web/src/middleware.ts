import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that don't require authentication
const PUBLIC_PATHS = ['/', '/login', '/register', '/privacy', '/data-deletion']

// Paths the middleware must not intercept
const STATIC_PREFIXES = ['/_next', '/favicon', '/api', '/videos', '/images']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip static assets and API route handlers
  if (STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + '/'),
  )

  // Cookie presence is the server-side auth signal (set by /api/auth/login)
  const hasRefreshToken = request.cookies.has('sa_refresh_token')

  console.log(`[middleware] ${pathname} | public=${isPublic} | hasToken=${hasRefreshToken}`)

  // Authenticated user visiting /login or /register → send to dashboard
  // The landing page (/) stays accessible regardless of auth state.
  if (isPublic && hasRefreshToken && pathname !== '/') {
    console.log('[middleware] authenticated on public route → /overview')
    return NextResponse.redirect(new URL('/overview', request.url))
  }

  // Unauthenticated user visiting a protected route → redirect to /login
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
