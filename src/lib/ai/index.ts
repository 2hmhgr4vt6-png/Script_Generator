import 'server-only'
import { workspaceCredentials, type ResolvedCredentials } from '@/lib/credentials'
import { AnthropicProvider } from './providers/anthropic'
import { OpenAIProvider } from './providers/openai'
import type { AIProvider } from './types'

export * from './types'

const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini'
const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1'
const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-5'

/**
 * Builds the configured LLM from resolved credentials (Settings first, then
 * environment). Returns null when no key is available — callers then fall back
 * to clearly-labelled demo generation rather than inventing live-looking output.
 */
export function buildAIProvider(credentials: ResolvedCredentials): AIProvider | null {
  const preferred = credentials.get('AI_PROVIDER')?.toLowerCase()
  const openaiKey = credentials.get('OPENAI_API_KEY')
  const anthropicKey = credentials.get('ANTHROPIC_API_KEY')

  if (preferred === 'anthropic' || (!preferred && !openaiKey && anthropicKey)) {
    if (!anthropicKey) return null
    return new AnthropicProvider(anthropicKey, credentials.get('ANTHROPIC_MODEL') ?? DEFAULT_ANTHROPIC_MODEL)
  }
  if (preferred === 'openai' || !preferred) {
    if (!openaiKey) return null
    return new OpenAIProvider(
      openaiKey,
      credentials.get('OPENAI_MODEL') ?? DEFAULT_OPENAI_MODEL,
      credentials.get('OPENAI_BASE_URL') ?? DEFAULT_OPENAI_BASE_URL,
    )
  }
  return null
}

export async function getAIProvider(): Promise<AIProvider | null> {
  return buildAIProvider(await workspaceCredentials())
}

export async function aiStatus(): Promise<{ connected: boolean; provider: string | null; model: string | null }> {
  const provider = await getAIProvider()
  return {
    connected: Boolean(provider),
    provider: provider?.name ?? null,
    model: provider?.model ?? null,
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
    throw new Error('The AI response could not be parsed. Please try again.')
  }
}
