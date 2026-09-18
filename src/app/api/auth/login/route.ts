import { headers } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { AppError, apiHandler } from '@/lib/api'
import { clientKey, rateLimit, resetRateLimit } from '@/lib/auth/rate-limit'
import { authenticate } from '@/lib/auth/service'
import { createSessionToken, setSessionCookie } from '@/lib/auth/session'
import { loginSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    const body = loginSchema.parse(await request.json())
    const key = clientKey(headers(), `login:${body.email.toLowerCase()}`)

    const limit = rateLimit(key, { limit: 5, windowSeconds: 300, blockSeconds: 900 })
    if (!limit.allowed) {
      throw new AppError(
        `Too many sign-in attempts. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minutes.`,
        429,
        'rate_limited',
      )
    }

    const result = await authenticate(body.email, body.password)
    if (!result.ok || !result.user) {
      throw new AppError(result.error ?? 'Incorrect email or password.', 401, 'invalid_credentials')
    }

    resetRateLimit(key)
    const token = await createSessionToken({
      sub: result.user.id,
      email: result.user.email,
      name: result.user.name,
    })
    await setSessionCookie(token)

    return { ok: true, user: { email: result.user.email, name: result.user.name } }
  })
}
