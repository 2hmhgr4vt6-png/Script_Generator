import { headers } from 'next/headers'
import type { NextRequest } from 'next/server'
import { AppError, apiHandler } from '@/lib/api'
import { requireApiUser } from '@/lib/auth/guard'
import { checkPasswordStrength } from '@/lib/auth/password'
import { clientKey, rateLimit } from '@/lib/auth/rate-limit'
import { changePassword } from '@/lib/auth/service'
import { clearSessionCookie } from '@/lib/auth/session'
import { changePasswordSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    const user = await requireApiUser()
    const limit = rateLimit(clientKey(headers(), `change-password:${user.id}`), { limit: 5, windowSeconds: 900 })
    if (!limit.allowed) throw new AppError('Too many attempts. Try again later.', 429, 'rate_limited')

    const body = changePasswordSchema.parse(await request.json())
    const strength = checkPasswordStrength(body.new_password)
    if (!strength.ok) throw new AppError(strength.problems.join(' '), 422, 'weak_password')

    const result = await changePassword(user.id, body.current_password, body.new_password)
    if (!result.ok) throw new AppError(result.error ?? 'Could not change the password.', 400, 'change_failed')

    // Force a fresh sign-in with the new password.
    clearSessionCookie()
    return { ok: true, message: 'Password changed. Please sign in again.' }
  })
}
