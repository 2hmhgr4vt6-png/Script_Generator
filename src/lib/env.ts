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

/**
 * Reads the admin password hash.
 *
 * A bcrypt hash starts with `$2a$` / `$2b$`, and dotenv expands `$VAR` when the
 * file is loaded — an unescaped hash silently becomes a truncated string. So we
 * accept either an escaped value (`\$2a\$12\$...`) or a base64-encoded one, and
 * warn loudly rather than failing every sign-in with "incorrect password".
 */
function adminPasswordHash(): string | undefined {
  const b64 = read('BHASIKA_ADMIN_PASSWORD_HASH_B64')
  if (b64) {
    const decoded = Buffer.from(b64, 'base64').toString('utf8').trim()
    if (BCRYPT_PATTERN.test(decoded)) return decoded
    console.error('[bhasika:env] BHASIKA_ADMIN_PASSWORD_HASH_B64 did not decode to a bcrypt hash.')
    return undefined
  }

  const value = read('BHASIKA_ADMIN_PASSWORD_HASH')
  if (!value) return undefined
  if (BCRYPT_PATTERN.test(value)) return value

  console.error(
    '[bhasika:env] BHASIKA_ADMIN_PASSWORD_HASH is not a valid bcrypt hash. ' +
      'Dotenv expands unescaped "$" — write it as \\$2a\\$12\\$... in .env.local, ' +
      'or set BHASIKA_ADMIN_PASSWORD_HASH_B64 to the base64 of the hash.',
  )
  return undefined
}

const BCRYPT_PATTERN = /^\$2[aby]?\$\d{2}\$[./A-Za-z0-9]{53}$/

export const env = {
  appUrl: read('NEXT_PUBLIC_APP_URL') ?? 'http://localhost:3000',
  nodeEnv: process.env.NODE_ENV ?? 'development',

  // Auth
  authSecret: read('AUTH_SECRET'),
  sessionTtlHours: Number(read('AUTH_SESSION_TTL_HOURS') ?? '12'),
  adminEmail: read('BHASIKA_ADMIN_EMAIL'),
  adminPasswordHash: adminPasswordHash(),

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
