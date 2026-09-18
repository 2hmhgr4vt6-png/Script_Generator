import 'server-only'
import { env } from '@/lib/env'
import { AnthropicProvider } from './providers/anthropic'
import { OpenAIProvider } from './providers/openai'
import type { AIProvider } from './types'

export * from './types'

/**
 * Resolves the configured LLM. Returns null when no key is present — callers
 * then fall back to clearly-labelled demo generation rather than inventing
 * content that looks live.
 */
export function getAIProvider(): AIProvider | null {
  const preferred = env.aiProvider?.toLowerCase()

  if (preferred === 'anthropic' || (!preferred && !env.openaiApiKey && env.anthropicApiKey)) {
    if (!env.anthropicApiKey) return null
    return new AnthropicProvider(env.anthropicApiKey, env.anthropicModel)
  }
  if (preferred === 'openai' || !preferred) {
    if (!env.openaiApiKey) return null
    return new OpenAIProvider(env.openaiApiKey, env.openaiModel, env.openaiBaseUrl)
  }
  return null
}

export function aiStatus(): { connected: boolean; provider: string | null; model: string | null } {
  const provider = getAIProvider()
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
