import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  

  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'
  const baseUrl = apiUrl.replace('/api', '')

  
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", 
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' " + baseUrl + " wss:" + baseUrl.replace('https:', '').replace('http:', ''),
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  )

  
  response.headers.set('X-Frame-Options', 'DENY')

  
  response.headers.set('X-Content-Type-Options', 'nosniff')

  
  response.headers.set('X-XSS-Protection', '1; mode=block')

  
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  )

  
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }

  
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin')
  response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp')

  
  response.headers.delete('X-Powered-By')

  return response
}


export const config = {
  matcher: [
    






    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
