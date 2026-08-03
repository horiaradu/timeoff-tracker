import { NextResponse } from 'next/server'
import { auth } from '@/auth'

/**
 * Sends signed-out visitors to the login page. This is only a first pass: every
 * server action and route handler verifies the session again on its own.
 */
export default auth((request) => {
  const isLogin = request.nextUrl.pathname === '/login'

  if (!request.auth && !isLogin) {
    const login = new URL('/login', request.nextUrl)
    return NextResponse.redirect(login)
  }

  if (request.auth && isLogin) {
    return NextResponse.redirect(new URL('/', request.nextUrl))
  }
})

export const config = {
  // `monitoring` is Sentry's tunnel: redirecting it would swallow browser error reports.
  matcher: ['/((?!api/auth|monitoring|_next/static|_next/image|favicon.ico).*)'],
}
