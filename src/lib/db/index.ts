import 'server-only'
import { randomUUID } from 'crypto'
import { env } from '@/lib/env'
import { JsonStore } from './json-store'
import { PostgresStore } from './postgres-store'
import type { Store } from './store'

export type { Store, ListOptions, Row } from './store'
export { TABLES } from './schema'
export type { TableName } from './schema'

let storePromise: Promise<Store> | null = null

/**
 * Returns the configured store. Postgres when DATABASE_URL is set, otherwise a
 * local JSON file so the studio runs with no external services.
 */
export function getStore(): Promise<Store> {
  if (!storePromise) {
    storePromise = (async () => {
      const store: Store = env.databaseUrl ? new PostgresStore(env.databaseUrl) : new JsonStore()
      await store.init()
      return store
    })().catch((error) => {
      storePromise = null
      throw error
    })
  }
  return storePromise
}

export function newId(): string {
  return randomUUID()
}

export function now(): string {
  return new Date().toISOString()
}
