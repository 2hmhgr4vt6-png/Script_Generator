import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const SESSION_COOKIE = 'bhasika_session'

const PUBLIC_PATHS = ['/login', '/privacy']
const PUBLIC_API = ['/api/auth/login', '/api/auth/logout', '/api/health']

/**
 * Edge gate for every dashboard page and API route.
 *
 * It only checks that a signature is valid — the full account lookup happens
 * again server-side in requirePageUser / requireApiUser.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPublicPage = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  const isPublicApi = PUBLIC_API.some((p) => pathname === p)
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const authenticated = await isValid(token)

  if (authenticated && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  if (isPublicPage || isPublicApi) return NextResponse.next()
  if (authenticated) return NextResponse.next()

  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'Your session has expired. Please sign in again.', code: 'unauthorized' },
      { status: 401 },
    )
  }

  const loginUrl = new URL('/login', request.url)
  if (pathname !== '/') loginUrl.searchParams.set('next', pathname)
  return NextResponse.redirect(loginUrl)
}

async function isValid(token: string | undefined): Promise<boolean> {
  if (!token) return false
  const secret = process.env.AUTH_SECRET
  if (!secret) {
    // Without a stable secret the edge cannot verify; the server guard decides.
    return process.env.NODE_ENV !== 'production'
  }
  try {
    await jwtVerify(token, new TextEncoder().encode(secret), { issuer: 'bhasika-studio' })
    return true
  } catch {
    return false
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.png$).*)'],
}
