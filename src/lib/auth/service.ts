import 'server-only'
import { getStore, newId, now } from '@/lib/db'
import { env } from '@/lib/env'
import type { User, UserPreferences } from '@/lib/types'
import { hashPassword, verifyPassword } from './password'

const DEFAULT_ADMIN_EMAIL = 'admin@bhasika.com'

export interface AuthResult {
  ok: boolean
  user?: User
  error?: string
}

/**
 * Creates the admin account from environment configuration the first time it is
 * needed. The password is only ever read as a bcrypt hash — plaintext never
 * enters the database, and never enters the repository.
 */
export async function ensureAdminUser(): Promise<User | null> {
  const store = await getStore()
  const email = (env.adminEmail ?? DEFAULT_ADMIN_EMAIL).toLowerCase()
  const existing = await store.findOne<User>('users', { email })
  if (existing) return existing

  if (!env.adminPasswordHash) return null

  const timestamp = now()
  const user: User = {
    id: newId(),
    email,
    password_hash: env.adminPasswordHash,
    name: 'Bhasika Admin',
    role: 'admin',
    created_at: timestamp,
    updated_at: timestamp,
  }
  await store.insert('users', user)
  await ensurePreferences(user.id)
  return user
}

export async function ensurePreferences(userId: string): Promise<UserPreferences> {
  const store = await getStore()
  const existing = await store.findOne<UserPreferences>('user_preferences', { user_id: userId })
  if (existing) return existing
  const timestamp = now()
  const prefs: UserPreferences = {
    id: newId(),
    user_id: userId,
    default_language: 'ne',
    default_duration: 60,
    default_platform: 'instagram-reels',
    default_tone: 'relatable',
    learning_enabled: true,
    research_schedule: 'off',
    research_schedule_cron: null,
    created_at: timestamp,
    updated_at: timestamp,
  }
  await store.insert('user_preferences', prefs)
  return prefs
}

export async function authenticate(email: string, password: string): Promise<AuthResult> {
  const store = await getStore()
  const normalised = email.trim().toLowerCase()
  await ensureAdminUser()

  const user = await store.findOne<User>('users', { email: normalised })
  if (!user) {
    // Constant-ish work so a missing account is not obviously faster than a bad password.
    await verifyPassword(password, '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv')
    return { ok: false, error: 'Incorrect email or password.' }
  }

  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) return { ok: false, error: 'Incorrect email or password.' }

  await store.insert('login_attempts', {
    id: newId(),
    identifier: normalised,
    succeeded: true,
    created_at: now(),
  })
  return { ok: true, user }
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  nextPassword: string,
): Promise<AuthResult> {
  const store = await getStore()
  const user = await store.get<User>('users', userId)
  if (!user) return { ok: false, error: 'Account not found.' }

  const valid = await verifyPassword(currentPassword, user.password_hash)
  if (!valid) return { ok: false, error: 'Your current password is incorrect.' }

  const password_hash = await hashPassword(nextPassword)
  const updated = await store.update<User>('users', userId, { password_hash, updated_at: now() })
  return { ok: true, user: updated ?? user }
}

export async function getUserById(id: string): Promise<User | null> {
  const store = await getStore()
  return store.get<User>('users', id)
}

/** True when the studio has no way to sign anyone in yet. */
export function isAdminProvisioned(): boolean {
  return Boolean(env.adminPasswordHash)
}
