/**
 * Describes every integration the studio can hold credentials for.
 *
 * Client-safe: this file contains field *names* and help text only — never a
 * value. The Settings UI renders forms from it, and the server validates
 * incoming field names against it.
 */

export type IntegrationId =
  | 'ai-routing'
  | 'gemini'
  | 'groq'
  | 'openrouter'
  | 'ollama'
  | 'deepseek'
  | 'openai'
  | 'anthropic'
  | 'search'
  | 'reddit'
  | 'youtube'
  | 'facebook'
  | 'instagram'

/** AI providers, in the order they are auto-selected when no explicit choice is stored. */
export const AI_PROVIDER_IDS = [
  'gemini', 'groq', 'openrouter', 'ollama', 'deepseek', 'openai', 'anthropic',
] as const
export type AIProviderId = (typeof AI_PROVIDER_IDS)[number]

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
  /**
   * Renders the options as a pick-list but still allows a typed value, for
   * model names that change faster than this file does.
   */
  allowCustom?: boolean
}

export interface IntegrationSpec {
  id: IntegrationId
  label: string
  group: 'ai' | 'search' | 'social' | 'routing'
  summary: string
  docsUrl: string
  /** Short, honest note about what this integration can actually do. */
  caveat?: string
  /** Set when the provider has a usable tier that needs no payment method. */
  free?: { label: string; note: string }
  fields: IntegrationField[]
}

export const INTEGRATIONS: IntegrationSpec[] = [
  {
    id: 'ai-routing',
    label: 'Active AI provider',
    group: 'routing',
    summary: 'Which configured provider writes the scripts.',
    docsUrl: '',
    fields: [
      {
        key: 'AI_PROVIDER',
        label: 'Use',
        secret: false,
        required: false,
        options: [
          { value: '', label: 'Automatic (first one configured)' },
          { value: 'gemini', label: 'Google Gemini' },
          { value: 'groq', label: 'Groq' },
          { value: 'openrouter', label: 'OpenRouter' },
          { value: 'ollama', label: 'Ollama (local)' },
          { value: 'deepseek', label: 'DeepSeek' },
          { value: 'openai', label: 'OpenAI' },
          { value: 'anthropic', label: 'Anthropic' },
        ],
      },
    ],
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    group: 'ai',
    summary: 'Powers fact extraction, hooks, script generation, rewriting and fact checking.',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    free: {
      label: 'Free · no card',
      note: 'Google AI Studio issues a key with a Google account and no payment method. Flash models are on the free tier; rate limits apply per minute and per day.',
    },
    caveat: 'Best free option for Nepali — Gemini handles Devanagari noticeably better than the small open models.',
    fields: [
      { key: 'GEMINI_API_KEY', label: 'API key', secret: true, required: true, placeholder: 'AIza…' },
      {
        key: 'GEMINI_MODEL',
        label: 'Model',
        secret: false,
        required: false,
        allowCustom: true,
        options: [
          { value: 'gemini-3.8-flash', label: 'gemini-3.8-flash (recommended)' },
          { value: 'gemini-3-flash', label: 'gemini-3-flash' },
          { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash' },
          { value: 'gemini-2.0-flash', label: 'gemini-2.0-flash' },
        ],
        help: 'Flash models are the free tier. Pro models require billing.',
      },
    ],
  },
  {
    id: 'groq',
    label: 'Groq',
    group: 'ai',
    summary: 'Very fast open-model inference for the same generation work.',
    docsUrl: 'https://console.groq.com/keys',
    free: {
      label: 'Free · no card',
      note: 'A key takes an email address and about a minute. Free accounts are rate-limited per minute and per day across the whole organisation.',
    },
    caveat: 'Fast and genuinely free, but open models are weaker at Nepali than Gemini. Good for English scripts.',
    fields: [
      { key: 'GROQ_API_KEY', label: 'API key', secret: true, required: true, placeholder: 'gsk_…' },
      {
        key: 'GROQ_MODEL',
        label: 'Model',
        secret: false,
        required: false,
        allowCustom: true,
        options: [
          { value: 'llama-3.3-70b-versatile', label: 'llama-3.3-70b-versatile (recommended)' },
          { value: 'llama-3.1-8b-instant', label: 'llama-3.1-8b-instant (faster)' },
          { value: 'openai/gpt-oss-120b', label: 'openai/gpt-oss-120b' },
        ],
        help: 'Pick from the list unless you know Groq serves another id.',
      },
    ],
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    group: 'ai',
    summary: 'One key, many models — including some offered at no cost.',
    docsUrl: 'https://openrouter.ai/keys',
    free: {
      label: 'Free models',
      note: 'Models whose id ends in ":free" cost nothing. Check the current list and its limits on openrouter.ai/models before relying on one.',
    },
    fields: [
      { key: 'OPENROUTER_API_KEY', label: 'API key', secret: true, required: true, placeholder: 'sk-or-…' },
      {
        key: 'OPENROUTER_MODEL',
        label: 'Model',
        secret: false,
        required: false,
        allowCustom: true,
        options: [
          { value: 'meta-llama/llama-3.3-70b-instruct:free', label: 'llama-3.3-70b-instruct:free' },
          { value: 'google/gemini-2.0-flash-exp:free', label: 'gemini-2.0-flash-exp:free' },
          { value: 'deepseek/deepseek-chat:free', label: 'deepseek-chat:free' },
        ],
        help: 'Ids ending in ":free" cost nothing. Check openrouter.ai/models for the current list.',
      },
    ],
  },
  {
    id: 'ollama',
    label: 'Ollama (local)',
    group: 'ai',
    summary: 'Runs a model on your own machine. No key, no account, no limits.',
    docsUrl: 'https://ollama.com/download',
    free: {
      label: 'Free · offline',
      note: 'Install Ollama, run `ollama pull llama3.1`, and point the studio at it. Nothing leaves your computer.',
    },
    caveat: 'Needs a reasonably powerful machine, and quality depends on the model you pull. Only reachable from where the studio runs.',
    fields: [
      {
        key: 'OLLAMA_BASE_URL',
        label: 'Server URL',
        secret: false,
        required: true,
        placeholder: 'http://localhost:11434/v1',
        help: 'Ollama\'s OpenAI-compatible endpoint. Keep the /v1 on the end.',
      },
      {
        key: 'OLLAMA_MODEL',
        label: 'Model',
        secret: false,
        required: false,
        allowCustom: true,
        options: [
          { value: 'llama3.1', label: 'llama3.1' },
          { value: 'llama3.2', label: 'llama3.2' },
          { value: 'qwen2.5', label: 'qwen2.5' },
          { value: 'mistral', label: 'mistral' },
        ],
        help: 'Must already be pulled, e.g. `ollama pull llama3.1`.',
      },
    ],
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    group: 'ai',
    summary: 'Low-cost models for the same generation work.',
    docsUrl: 'https://platform.deepseek.com/api_keys',
    caveat:
      'A DeepSeek key belongs here, not on the OpenAI card — they are different services, and OpenAI will reject it.',
    fields: [
      { key: 'DEEPSEEK_API_KEY', label: 'API key', secret: true, required: true, placeholder: 'sk-…' },
      {
        key: 'DEEPSEEK_MODEL',
        label: 'Model',
        secret: false,
        required: false,
        allowCustom: true,
        options: [
          { value: 'deepseek-flash', label: 'deepseek-flash (recommended)' },
          { value: 'deepseek-v4-pro', label: 'deepseek-v4-pro' },
        ],
      },
    ],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    group: 'ai',
    summary: 'Powers fact extraction, hooks, script generation, rewriting and fact checking.',
    docsUrl: 'https://platform.openai.com/api-keys',
    caveat: 'Requires a payment method — OpenAI has no free API tier. Use Gemini, Groq or Ollama to stay free.',
    fields: [
      { key: 'OPENAI_API_KEY', label: 'API key', secret: true, required: true, placeholder: 'sk-…' },
      {
        key: 'OPENAI_MODEL',
        label: 'Model',
        secret: false,
        required: false,
        allowCustom: true,
        options: [
          { value: 'gpt-4o-mini', label: 'gpt-4o-mini' },
          { value: 'gpt-4o', label: 'gpt-4o' },
          { value: 'gpt-4.1-mini', label: 'gpt-4.1-mini' },
        ],
        help: 'Only for keys issued by OpenAI. A key from another provider belongs on that provider\'s card.',
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
    caveat: 'Requires a payment method — Anthropic has no free API tier. Use Gemini, Groq or Ollama to stay free.',
    fields: [
      { key: 'ANTHROPIC_API_KEY', label: 'API key', secret: true, required: true, placeholder: 'sk-ant-…' },
      {
        key: 'ANTHROPIC_MODEL',
        label: 'Model',
        secret: false,
        required: false,
        allowCustom: true,
        options: [
          { value: 'claude-sonnet-5', label: 'claude-sonnet-5' },
          { value: 'claude-opus-5', label: 'claude-opus-5' },
          { value: 'claude-haiku-4-5-20251001', label: 'claude-haiku-4.5' },
        ],
        help: 'Only for keys issued by Anthropic.',
      },
    ],
  },
  {
    id: 'search',
    label: 'Web search',
    group: 'search',
    summary: 'Searches the live internet for research and finds public discussions for problem discovery.',
    docsUrl: 'https://app.tavily.com/home',
    free: {
      label: 'Free · no card',
      note: 'Tavily issues a monthly credit allowance with no payment method. One basic search costs one credit.',
    },
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
    free: { label: 'Free', note: 'Reddit API credentials cost nothing for this kind of read-only use.' },
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
    free: { label: 'Free quota', note: 'The YouTube Data API has a daily quota that costs nothing. No billing account is needed to use it.' },
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
