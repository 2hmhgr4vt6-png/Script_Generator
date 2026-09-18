import 'server-only'
import { randomBytes } from 'crypto'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { env } from '@/lib/env'

export const SESSION_COOKIE = 'bhasika_session'
export const CSRF_COOKIE = 'bhasika_csrf'

export interface SessionPayload {
  sub: string
  email: string
  name?: string | null
}

let cachedSecret: Uint8Array | null = null

function secret(): Uint8Array {
  if (cachedSecret) return cachedSecret
  let value = env.authSecret
  if (!value) {
    if (env.nodeEnv === 'production') {
      throw new Error('AUTH_SECRET is required in production. Generate one with: openssl rand -base64 32')
    }
    // Development convenience only: sessions do not survive a restart.
    const globalScope = globalThis as { __bhasikaDevSecret?: string }
    globalScope.__bhasikaDevSecret ??= randomBytes(32).toString('hex')
    value = globalScope.__bhasikaDevSecret
  }
  cachedSecret = new TextEncoder().encode(value)
  return cachedSecret
}

function ttlSeconds(): number {
  const hours = Number.isFinite(env.sessionTtlHours) && env.sessionTtlHours > 0 ? env.sessionTtlHours : 12
  return Math.round(hours * 3600)
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ email: payload.email, name: payload.name ?? null })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setIssuer('bhasika-studio')
    .setExpirationTime(`${ttlSeconds()}s`)
    .sign(secret())
}

export async function readSessionToken(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: 'bhasika-studio' })
    if (!payload.sub) return null
    return { sub: payload.sub, email: String(payload.email ?? ''), name: (payload.name as string) ?? null }
  } catch {
    return null
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ttlSeconds(),
  })
}

export function clearSessionCookie(): void {
  cookies().delete(SESSION_COOKIE)
  cookies().delete(CSRF_COOKIE)
}

export async function getSession(): Promise<SessionPayload | null> {
  return readSessionToken(cookies().get(SESSION_COOKIE)?.value)
}
