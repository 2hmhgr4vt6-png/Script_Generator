import 'server-only'
import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import { getSession, type SessionPayload } from './session'
import { ensurePreferences, getUserById } from './service'
import type { User } from '@/lib/types'

/** For server components inside the protected dashboard. */
export async function requirePageUser(): Promise<User> {
  const session = await getSession()
  if (!session) redirect('/login')
  const user = await getUserById(session.sub)
  if (!user) redirect('/login?error=session-expired')
  await ensurePreferences(user.id)
  return user
}

export class UnauthorizedError extends Error {
  constructor(message = 'You need to sign in to do that.') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

/** For route handlers. Throws UnauthorizedError, which apiHandler turns into a 401. */
export async function requireApiUser(): Promise<User> {
  const session: SessionPayload | null = await getSession()
  if (!session) throw new UnauthorizedError()
  const user = await getUserById(session.sub)
  if (!user) throw new UnauthorizedError('Your session has expired. Please sign in again.')
  return user
}

export function unauthorizedResponse(message = 'Unauthorized'): NextResponse {
  return NextResponse.json({ error: message, code: 'unauthorized' }, { status: 401 })
}
