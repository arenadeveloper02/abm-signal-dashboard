import { type NextRequest, NextResponse } from 'next/server'
import { ARENA_EMAIL_COOKIE_NAME } from '@/lib/arena-email-constants'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  response.headers.set('Content-Security-Policy', 'frame-ancestors *')

  const fromQuery = request.nextUrl.searchParams.get('emailId')?.trim() ?? ''
  if (fromQuery) {
    response.cookies.set(ARENA_EMAIL_COOKIE_NAME, fromQuery, {
      path: '/',
      secure: true,
      sameSite: 'none',
      httpOnly: true,
    })
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
