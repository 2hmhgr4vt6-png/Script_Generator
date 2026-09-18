import 'server-only'
import { AI_PROVIDER_IDS, workspaceCredentials, type AIProviderId, type ResolvedCredentials } from '@/lib/credentials'
import { AnthropicProvider } from './providers/anthropic'
import { OpenAIProvider } from './providers/openai'
import { FailoverAIProvider } from './failover'
import { AIProviderError, type AIProvider } from './types'

export * from './types'

/**
 * Gemini, Groq, OpenRouter and Ollama all speak the OpenAI chat-completions
 * protocol, so they are presets over one client rather than separate
 * implementations. Only Anthropic needs its own shape.
 */
interface OpenAICompatiblePreset {
  keyField: string
  modelField: string
  defaultModel: string
  baseUrl: string
  /** Ollama runs locally and authenticates nothing. */
  keyless?: boolean
  baseUrlField?: string
  /** Extra body fields this provider needs (e.g. Gemini's reasoning controls). */
  requestDefaults?: Record<string, unknown>
  /**
   * Floor for max_tokens. Reasoning models spend part of the budget on thinking
   * before emitting any text, so too small a ceiling returns an empty message.
   */
  minMaxTokens?: number
}

const PRESETS: Record<string, OpenAICompatiblePreset> = {
  gemini: {
    baseUrlField: 'GEMINI_BASE_URL',
    keyField: 'GEMINI_API_KEY',
    modelField: 'GEMINI_MODEL',
    defaultModel: 'gemini-3.8-flash',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    // Gemini 3 models always think; 'low' keeps that budget small. Reasoning
    // tokens come out of max_tokens, hence the floor.
    requestDefaults: { reasoning_effort: 'low' },
    minMaxTokens: 1024,
  },
  groq: {
    baseUrlField: 'GROQ_BASE_URL',
    keyField: 'GROQ_API_KEY',
    modelField: 'GROQ_MODEL',
    defaultModel: 'llama-3.3-70b-versatile',
    baseUrl: 'https://api.groq.com/openai/v1',
  },
  openrouter: {
    baseUrlField: 'OPENROUTER_BASE_URL',
    keyField: 'OPENROUTER_API_KEY',
    modelField: 'OPENROUTER_MODEL',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
    baseUrl: 'https://openrouter.ai/api/v1',
  },
  ollama: {
    keyField: '',
    modelField: 'OLLAMA_MODEL',
    defaultModel: 'llama3.1',
    baseUrl: 'http://localhost:11434/v1',
    baseUrlField: 'OLLAMA_BASE_URL',
    keyless: true,
  },
  deepseek: {
    baseUrlField: 'DEEPSEEK_BASE_URL',
    keyField: 'DEEPSEEK_API_KEY',
    modelField: 'DEEPSEEK_MODEL',
    defaultModel: 'deepseek-flash',
    baseUrl: 'https://api.deepseek.com',
  },
  openai: {
    keyField: 'OPENAI_API_KEY',
    modelField: 'OPENAI_MODEL',
    defaultModel: 'gpt-4o-mini',
    baseUrl: 'https://api.openai.com/v1',
    baseUrlField: 'OPENAI_BASE_URL',
  },
}

const ANTHROPIC_DEFAULT_MODEL = 'claude-sonnet-5'

/** Builds one named provider, or null when it has no usable credentials. */
export function buildNamedAIProvider(id: AIProviderId, credentials: ResolvedCredentials): AIProvider | null {
  if (id === 'anthropic') {
    const key = credentials.get('ANTHROPIC_API_KEY')
    if (!key) return null
    return new AnthropicProvider(key, credentials.get('ANTHROPIC_MODEL') ?? ANTHROPIC_DEFAULT_MODEL)
  }

  const preset = PRESETS[id]
  if (!preset) return null

  const baseUrl = (preset.baseUrlField ? credentials.get(preset.baseUrlField) : undefined) ?? preset.baseUrl
  const model = credentials.get(preset.modelField) ?? preset.defaultModel

  const options = {
    name: id,
    requestDefaults: preset.requestDefaults,
    minMaxTokens: preset.minMaxTokens,
  }

  if (preset.keyless) {
    // Only counts as configured once the user has actually pointed at a server.
    if (!preset.baseUrlField || !credentials.get(preset.baseUrlField)) return null
    return new OpenAIProvider('ollama', model, baseUrl, options)
  }

  const key = credentials.get(preset.keyField)
  if (!key) return null
  return new OpenAIProvider(key, model, baseUrl, options)
}

/**
 * Resolves the provider chain.
 *
 * Every configured provider is included, ordered by the explicit choice first
 * (when one is stored) and otherwise by AI_PROVIDER_IDS, which puts the
 * no-payment-method options first. The chain falls through on failure, so a
 * provider that is rate-limited or misconfigured does not stop the work.
 */
export function buildAIProvider(credentials: ResolvedCredentials): AIProvider | null {
  const chosen = credentials.get('AI_PROVIDER')?.toLowerCase() as AIProviderId | undefined
  const order: AIProviderId[] =
    chosen && (AI_PROVIDER_IDS as readonly string[]).includes(chosen)
      ? [chosen, ...AI_PROVIDER_IDS.filter((id) => id !== chosen)]
      : [...AI_PROVIDER_IDS]

  const providers = order
    .map((id) => buildNamedAIProvider(id, credentials))
    .filter((provider): provider is AIProvider => provider !== null)

  if (!providers.length) return null
  if (providers.length === 1) return providers[0]
  return new FailoverAIProvider(providers)
}

/** Every provider that currently has usable credentials, in fallback order. */
export function configuredAIProviders(credentials: ResolvedCredentials): AIProvider[] {
  const provider = buildAIProvider(credentials)
  if (!provider) return []
  return provider instanceof FailoverAIProvider ? provider.providers : [provider]
}

export async function getAIProvider(): Promise<AIProvider | null> {
  return buildAIProvider(await workspaceCredentials())
}

export async function aiStatus(): Promise<{
  connected: boolean
  provider: string | null
  model: string | null
  fallbacks: string[]
}> {
  const provider = await getAIProvider()
  return {
    connected: Boolean(provider),
    provider: provider?.name ?? null,
    model: provider?.model ?? null,
    fallbacks: provider instanceof FailoverAIProvider ? provider.available.slice(1) : [],
  }
}

/** Extracts a JSON object or array from a model response that may be fenced or padded with prose. */
export function parseJson<T>(raw: string): T {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced ? fenced[1] : trimmed
  try {
    return JSON.parse(candidate) as T
  } catch {
    const start = candidate.search(/[[{]/)
    const end = Math.max(candidate.lastIndexOf('}'), candidate.lastIndexOf(']'))
    if (start !== -1 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1)) as T
    }
    throw new AIProviderError(
      `The model replied with text that is not valid JSON, so the response could not be read. ` +
        `This usually means the model does not follow JSON mode well — try a different model in Settings. ` +
        `It began: "${trimmed.slice(0, 120).replace(/\s+/g, ' ')}"`,
    )
  }
}
