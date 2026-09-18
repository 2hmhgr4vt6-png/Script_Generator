import 'server-only'
import { getStore, newId, now } from '@/lib/db'
import type { User, UserPreferences } from '@/lib/types'

/**
 * The studio runs without authentication: there is one local workspace, and
 * every row is still scoped to its id so the data model (and the SQL schema)
 * stays unchanged if an account layer is ever added back.
 */
const STUDIO_EMAIL = 'studio@bhasika.local'

let cached: Promise<User> | null = null

export function getStudioUser(): Promise<User> {
  if (!cached) {
    cached = (async () => {
      const store = await getStore()
      const existing = await store.findOne<User>('users', { email: STUDIO_EMAIL })
      if (existing) return existing

      const timestamp = now()
      const user: User = {
        id: newId(),
        email: STUDIO_EMAIL,
        name: 'Bhasika',
        role: 'studio',
        created_at: timestamp,
        updated_at: timestamp,
      }
      await store.insert('users', user)
      await ensurePreferences(user.id)
      return user
    })().catch((error) => {
      cached = null
      throw error
    })
  }
  return cached
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

/** Kept as the single entry point used by pages and route handlers. */
export async function currentWorkspace(): Promise<User> {
  const user = await getStudioUser()
  await ensurePreferences(user.id)
  return user
}
