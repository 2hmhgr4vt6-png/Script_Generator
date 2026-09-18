import 'server-only'
import { AIProviderError, type AIMessage, type AIProvider, type CompletionOptions } from '../types'

/** Pulls the human-readable sentence out of a provider error body. */
function extractMessage(body: string): string {
  try {
    const parsed = JSON.parse(body)
    const node = Array.isArray(parsed) ? parsed[0] : parsed
    const message = node?.error?.message ?? node?.message
    if (typeof message === 'string') return message.slice(0, 180)
  } catch {
    // Not JSON — fall through.
  }
  return body.replace(/\s+/g, ' ').trim().slice(0, 180)
}

/**
 * Works against the OpenAI API or any OpenAI-compatible endpoint. Gemini, Groq,
 * OpenRouter and Ollama all expose one, so they share this client.
 */
export class OpenAIProvider implements AIProvider {
  readonly isLive = true

  constructor(
    private apiKey: string,
    readonly model: string,
    private baseUrl: string,
    /** Display name — Gemini, Groq, OpenRouter and Ollama all use this client. */
    readonly name: string = 'openai',
  ) {}

  private label(): string {
    const names: Record<string, string> = {
      openai: 'OpenAI',
      gemini: 'Gemini',
      groq: 'Groq',
      openrouter: 'OpenRouter',
      ollama: 'Ollama',
    }
    return names[this.name] ?? this.name
  }

  async complete(messages: AIMessage[], options: CompletionOptions = {}): Promise<string> {
    const body: Record<string, unknown> = {
      model: this.model,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2000,
      messages: options.system ? [{ role: 'system', content: options.system }, ...messages] : messages,
    }
    if (options.json) body.response_format = { type: 'json_object' }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 90_000)
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      const who = this.label()
      if (response.status === 401 || response.status === 403) {
        throw new AIProviderError(`The ${who} API key was rejected.`, 'invalid-key')
      }
      if (response.status === 429) {
        throw new AIProviderError(
          `${who} rate limit reached. Free tiers limit requests per minute and per day — wait a moment and try again.`,
          'rate-limited',
        )
      }
      if (response.status === 404) {
        throw new AIProviderError(
          `${who} does not recognise the model "${this.model}". Check the model name in Settings.`,
        )
      }
      if (!response.ok) {
        const detail = await response.text()
        // Gemini answers an invalid key with 400 rather than 401, and the body
        // is a JSON blob — surface the provider's sentence, not the envelope.
        const reason = extractMessage(detail)
        if (response.status === 400 && /api key/i.test(reason)) {
          throw new AIProviderError(`The ${who} API key was rejected.`, 'invalid-key')
        }
        throw new AIProviderError(`${who} request failed (${response.status})${reason ? `: ${reason}` : ''}`)
      }
      const json = (await response.json()) as { choices?: { message?: { content?: string } }[] }
      const content = json.choices?.[0]?.message?.content
      if (!content) throw new AIProviderError(`${this.label()} returned an empty response.`)
      return content
    } catch (error) {
      if (error instanceof AIProviderError) throw error
      if ((error as Error).name === 'AbortError') throw new AIProviderError('The AI request timed out.', 'timeout')
      const message = (error as Error).message
      if (/ECONNREFUSED|fetch failed/i.test(message) && this.name === 'ollama') {
        throw new AIProviderError(
          `Could not reach Ollama at ${this.baseUrl}. Is it running? Start it with \`ollama serve\`.`,
        )
      }
      throw new AIProviderError(message)
    } finally {
      clearTimeout(timeout)
    }
  }
}
