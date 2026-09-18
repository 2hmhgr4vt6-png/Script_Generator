/**
 * Central, server-only environment access.
 *
 * Nothing in this file may be imported from a client component — every value
 * here is a secret or decides how secrets are used.
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

  // AI
  aiProvider: read('AI_PROVIDER'),
  openaiApiKey: read('OPENAI_API_KEY'),
  openaiModel: read('OPENAI_MODEL') ?? 'gpt-4o-mini',
  openaiBaseUrl: read('OPENAI_BASE_URL') ?? 'https://api.openai.com/v1',
  anthropicApiKey: read('ANTHROPIC_API_KEY'),
  anthropicModel: read('ANTHROPIC_MODEL') ?? 'claude-sonnet-5',

  // Search
  searchProvider: read('SEARCH_PROVIDER'),
  searchApiKey: read('SEARCH_API_KEY'),

  // Social
  redditClientId: read('REDDIT_CLIENT_ID'),
  redditClientSecret: read('REDDIT_CLIENT_SECRET'),
  redditUserAgent: read('REDDIT_USER_AGENT') ?? 'bhasika-content-studio/1.0',
  youtubeApiKey: read('YOUTUBE_API_KEY'),
  facebookAccessToken: read('FACEBOOK_ACCESS_TOKEN'),
  instagramAccessToken: read('INSTAGRAM_ACCESS_TOKEN'),
} as const

/** Demo mode = no AI key configured. Every generated artefact is then labelled sample data. */
export function isDemoMode(): boolean {
  if (read('BHASIKA_DEMO_MODE') === 'true') return true
  return !env.openaiApiKey && !env.anthropicApiKey
}
