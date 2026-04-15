import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rotas que não precisam de autenticação
const PUBLIC_PATHS = ['/login', '/register']

// Rotas que o Next.js não deve interceptar
const STATIC_PREFIXES = ['/_next', '/favicon', '/api']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Ignora assets estáticos e route handlers
  if (STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  )

  // Presença do cookie de refresh token indica sessão ativa
  const hasRefreshToken = request.cookies.has('sa_refresh_token')

  // Usuário autenticado tentando acessar /login → redireciona para dashboard
  if (isPublic && hasRefreshToken) {
    return NextResponse.redirect(new URL('/overview', request.url))
  }

  // Usuário não autenticado tentando acessar rota protegida → redireciona para /login
  if (!isPublic && !hasRefreshToken) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname) // preserva rota de origem
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Aplica em todas as rotas exceto arquivos estáticos do Next.js
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
