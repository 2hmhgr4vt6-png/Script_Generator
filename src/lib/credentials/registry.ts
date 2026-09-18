/**
 * Describes every integration the studio can hold credentials for.
 *
 * Client-safe: this file contains field *names* and help text only — never a
 * value. The Settings UI renders forms from it, and the server validates
 * incoming field names against it.
 */

export type IntegrationId = 'openai' | 'anthropic' | 'search' | 'reddit' | 'youtube' | 'facebook' | 'instagram'

export interface IntegrationField {
  /** Also the environment variable name, so env and stored values stay interchangeable. */
  key: string
  label: string
  /** Secrets are write-only: stored encrypted, never returned, shown masked. */
  secret: boolean
  required: boolean
  placeholder?: string
  help?: string
  options?: { value: string; label: string }[]
}

export interface IntegrationSpec {
  id: IntegrationId
  label: string
  group: 'ai' | 'search' | 'social'
  summary: string
  docsUrl: string
  /** Short, honest note about what this integration can actually do. */
  caveat?: string
  fields: IntegrationField[]
}

export const INTEGRATIONS: IntegrationSpec[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    group: 'ai',
    summary: 'Powers fact extraction, hooks, script generation, rewriting and fact checking.',
    docsUrl: 'https://platform.openai.com/api-keys',
    fields: [
      { key: 'OPENAI_API_KEY', label: 'API key', secret: true, required: true, placeholder: 'sk-…' },
      {
        key: 'OPENAI_MODEL',
        label: 'Model',
        secret: false,
        required: false,
        placeholder: 'gpt-4o-mini',
        help: 'Defaults to gpt-4o-mini.',
      },
      {
        key: 'OPENAI_BASE_URL',
        label: 'Base URL',
        secret: false,
        required: false,
        placeholder: 'https://api.openai.com/v1',
        help: 'Point at any OpenAI-compatible endpoint (Azure, a gateway, a local server).',
      },
    ],
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    group: 'ai',
    summary: 'Alternative LLM for the same generation and fact-checking work.',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    fields: [
      { key: 'ANTHROPIC_API_KEY', label: 'API key', secret: true, required: true, placeholder: 'sk-ant-…' },
      {
        key: 'ANTHROPIC_MODEL',
        label: 'Model',
        secret: false,
        required: false,
        placeholder: 'claude-sonnet-5',
        help: 'Defaults to claude-sonnet-5.',
      },
    ],
  },
  {
    id: 'search',
    label: 'Web search',
    group: 'search',
    summary: 'Searches the live internet for research and finds public discussions for problem discovery.',
    docsUrl: 'https://tavily.com',
    fields: [
      {
        key: 'SEARCH_PROVIDER',
        label: 'Provider',
        secret: false,
        required: true,
        options: [
          { value: 'tavily', label: 'Tavily' },
          { value: 'serper', label: 'Serper (Google)' },
          { value: 'exa', label: 'Exa' },
        ],
        help: 'Keys: tavily.com · serper.dev · exa.ai',
      },
      { key: 'SEARCH_API_KEY', label: 'API key', secret: true, required: true, placeholder: 'tvly-… / your key' },
    ],
  },
  {
    id: 'reddit',
    label: 'Reddit',
    group: 'social',
    summary: 'Finds public posts where people ask the questions Bhasika answers.',
    docsUrl: 'https://www.reddit.com/prefs/apps',
    caveat: 'Create an app of type "script". Public listings only — no private subreddits, no scraping.',
    fields: [
      { key: 'REDDIT_CLIENT_ID', label: 'Client ID', secret: true, required: true },
      { key: 'REDDIT_CLIENT_SECRET', label: 'Client secret', secret: true, required: true },
      {
        key: 'REDDIT_USER_AGENT',
        label: 'User agent',
        secret: false,
        required: false,
        placeholder: 'bhasika-content-studio/1.0 by u/yourname',
        help: 'Reddit requires a descriptive user agent that identifies you.',
      },
    ],
  },
  {
    id: 'youtube',
    label: 'YouTube',
    group: 'social',
    summary: 'Searches public videos on the topics your audience is asking about.',
    docsUrl: 'https://console.cloud.google.com/apis/credentials',
    caveat: 'Enable "YouTube Data API v3" on the project before the key will work.',
    fields: [{ key: 'YOUTUBE_API_KEY', label: 'API key', secret: true, required: true, placeholder: 'AIza…' }],
  },
  {
    id: 'facebook',
    label: 'Facebook',
    group: 'social',
    summary: 'Reads posts and comments from the Page this token manages.',
    docsUrl: 'https://developers.facebook.com/tools/explorer/',
    caveat:
      'Meta has no platform-wide public keyword search. A token only reaches content you own or manage, so this reads your own Page.',
    fields: [{ key: 'FACEBOOK_ACCESS_TOKEN', label: 'Page access token', secret: true, required: true }],
  },
  {
    id: 'instagram',
    label: 'Instagram',
    group: 'social',
    summary: 'Reads media and captions from the Instagram account this token manages.',
    docsUrl: 'https://developers.facebook.com/docs/instagram-api/',
    caveat:
      'Same limit as Facebook: the token reaches the connected Business account only, not public Instagram at large.',
    fields: [{ key: 'INSTAGRAM_ACCESS_TOKEN', label: 'Access token', secret: true, required: true }],
  },
]

export function integrationById(id: string): IntegrationSpec | undefined {
  return INTEGRATIONS.find((integration) => integration.id === id)
}

/** Every field name the app will accept from a client. */
export const ALLOWED_FIELD_KEYS = new Set(INTEGRATIONS.flatMap((i) => i.fields.map((f) => f.key)))

export function isSecretField(key: string): boolean {
  return INTEGRATIONS.some((i) => i.fields.some((f) => f.key === key && f.secret))
}

/** Where a value in use came from. */
export type CredentialOrigin = 'stored' | 'env' | 'none'

export interface IntegrationState {
  id: IntegrationId
  label: string
  group: IntegrationSpec['group']
  connected: boolean
  origin: CredentialOrigin
  /** Masked previews keyed by field name — never the value itself. */
  values: Record<string, { set: boolean; preview: string | null; origin: CredentialOrigin }>
  lastTestedAt: string | null
  lastTestStatus: 'ok' | 'failed' | null
  lastTestMessage: string | null
}
