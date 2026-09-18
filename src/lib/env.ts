/**
 * Central, server-only environment access.
 *
 * Provider credentials are no longer read from here — they go through
 * src/lib/credentials, which layers values saved in Settings over environment
 * variables. This file holds the settings that can only come from the
 * environment.
 */
import 'server-only'

function read(name: string): string | undefined {
  const value = process.env[name]
  if (!value || value.trim() === '') return undefined
  return value.trim()
}

export const env = {
  appUrl: read('NEXT_PUBLIC_APP_URL') ?? 'http://localhost:3000',
  nodeEnv: process.env.NODE_ENV ?? 'development',

  // Database
  databaseUrl: read('DATABASE_URL'),
  supabaseUrl: read('SUPABASE_URL'),
  supabaseAnonKey: read('SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: read('SUPABASE_SERVICE_ROLE_KEY'),
} as const

export function demoModeForced(): boolean {
  return read('BHASIKA_DEMO_MODE') === 'true'
}
