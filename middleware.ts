import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')
  const { pathname } = request.nextUrl

  // Public routes
  const isPublicRoute = pathname === '/' || pathname.startsWith('/api/auth/signup') || pathname.startsWith('/api/auth/signin')

  // If accessing protected route without token
  if (!token && !isPublicRoute) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // If has token, verify and redirect based on role
  if (token && pathname === '/') {
    const user = verifyToken(token.value)
    if (user) {
      if (user.role === 'CONTRIBUTOR') {
        return NextResponse.redirect(new URL('/contributor', request.url))
      } else if (user.role === 'REVIEWER') {
        return NextResponse.redirect(new URL('/reviewer', request.url))
      } else if (user.role === 'ADMIN') {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/contributor/:path*', '/reviewer/:path*', '/admin/:path*'],
}
