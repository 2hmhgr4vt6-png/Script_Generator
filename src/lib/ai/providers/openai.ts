import 'server-only'
import { AIProviderError, type AIMessage, type AIProvider, type CompletionOptions } from '../types'

const DISPLAY_NAMES: Record<string, string> = {
  openai: 'OpenAI',
  gemini: 'Gemini',
  groq: 'Groq',
  openrouter: 'OpenRouter',
  ollama: 'Ollama',
  deepseek: 'DeepSeek',
}

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

export interface OpenAICompatibleOptions {
  name?: string
  requestDefaults?: Record<string, unknown>
  minMaxTokens?: number
}

/**
 * Works against the OpenAI API or any OpenAI-compatible endpoint. Gemini, Groq,
 * OpenRouter, DeepSeek and Ollama all expose one, so they share this client.
 */
export class OpenAIProvider implements AIProvider {
  readonly isLive = true
  readonly name: string
  private requestDefaults: Record<string, unknown>
  private minMaxTokens: number

  constructor(
    private apiKey: string,
    readonly model: string,
    private baseUrl: string,
    options: OpenAICompatibleOptions = {},
  ) {
    this.name = options.name ?? 'openai'
    this.requestDefaults = options.requestDefaults ?? {}
    this.minMaxTokens = options.minMaxTokens ?? 0
  }

  private label(): string {
    return DISPLAY_NAMES[this.name] ?? this.name
  }

  /**
   * Asks the provider which models this key actually serves.
   *
   * Hardcoded fallback model names age badly and differ per account and per
   * region, so the real list beats any guess baked into this repository.
   */
  async listModels(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/models`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    })
    if (!response.ok) {
      throw new AIProviderError(`${this.label()} would not list its models (HTTP ${response.status}).`)
    }
    const json = (await response.json()) as { data?: { id?: string }[]; models?: { name?: string }[] }
    const ids = [
      ...(json.data ?? []).map((entry) => entry.id),
      // Ollama's native shape, in case /v1/models is proxied through.
      ...(json.models ?? []).map((entry) => entry.name),
    ].filter((id): id is string => Boolean(id))
    return [...new Set(ids)]
  }

  /** A copy of this client pointed at a different model. */
  withModel(model: string): OpenAIProvider {
    return new OpenAIProvider(this.apiKey, model, this.baseUrl, {
      name: this.name,
      requestDefaults: this.requestDefaults,
      minMaxTokens: this.minMaxTokens,
    })
  }

  async complete(messages: AIMessage[], options: CompletionOptions = {}): Promise<string> {
    try {
      return await this.withRetry(messages, options)
    } catch (error) {
      // Support for JSON mode varies across OpenAI-compatible providers. When a
      // provider rejects it, ask again in plain mode with the instruction moved
      // into the prompt — parseJson still copes with a fenced or padded reply.
      if (options.json && error instanceof AIProviderError && error.code === 'json-mode-unsupported') {
        return this.request(
          [
            ...messages.slice(0, -1),
            {
              ...messages[messages.length - 1],
              content: `${messages[messages.length - 1].content}\n\nRespond with raw JSON only. No prose, no markdown fences.`,
            },
          ],
          { ...options, json: false },
        )
      }
      throw error
    }
  }

  /**
   * Retries once on a transient upstream failure.
   *
   * "This model is currently experiencing high demand" (503) is the common one
   * on free tiers and usually clears in a second or two, so one short retry
   * avoids failing over unnecessarily. Rate limits are not retried here — they
   * last longer than a caller will wait, so the chain moves on instead.
   */
  private async withRetry(messages: AIMessage[], options: CompletionOptions): Promise<string> {
    try {
      return await this.request(messages, options)
    } catch (error) {
      if (!(error instanceof AIProviderError) || error.code !== 'transient') throw error
      await new Promise((resolve) => setTimeout(resolve, 1500))
      return this.request(messages, options)
    }
  }

  private async request(messages: AIMessage[], options: CompletionOptions = {}): Promise<string> {
    const body: Record<string, unknown> = {
      ...this.requestDefaults,
      model: this.model,
      temperature: options.temperature ?? 0.7,
      max_tokens: Math.max(options.maxTokens ?? 2000, this.minMaxTokens),
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
        // Ollama answers 404 for a model that exists upstream but has not been
        // pulled locally, which needs a different instruction entirely.
        if (this.name === 'ollama') {
          throw new AIProviderError(
            `Ollama does not have the model "${this.model}" yet. Pull it first: \`ollama pull ${this.model}\``,
            'model-not-found',
          )
        }
        throw new AIProviderError(
          `${who} does not recognise the model "${this.model}". Check the model name in Settings.`,
          'model-not-found',
        )
      }
      if (response.status === 500 || response.status === 502 || response.status === 503 || response.status === 504) {
        const detail = extractMessage(await response.text())
        throw new AIProviderError(
          `${who} is temporarily unavailable${detail ? `: ${detail}` : ` (HTTP ${response.status})`}`,
          'transient',
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
        if (response.status === 400 && /response_format|json_object|json mode|json_schema/i.test(reason)) {
          throw new AIProviderError(`${who} does not support JSON mode.`, 'json-mode-unsupported')
        }
        if (response.status === 400 && /model/i.test(reason)) {
          throw new AIProviderError(`${who} rejected the model "${this.model}": ${reason}`, 'model-not-found')
        }
        throw new AIProviderError(`${who} request failed (${response.status})${reason ? `: ${reason}` : ''}`)
      }

      const json = (await response.json()) as {
        choices?: { message?: { content?: string }; finish_reason?: string }[]
      }
      const choice = json.choices?.[0]
      const content = choice?.message?.content

      if (!content) {
        // Reasoning models spend max_tokens on thinking before writing anything,
        // so an exhausted budget comes back as a successful but empty message.
        if (choice?.finish_reason === 'length') {
          throw new AIProviderError(
            `${who} used its whole token budget on reasoning and returned no text. ` +
              `Try a model without reasoning, or a smaller target duration.`,
          )
        }
        throw new AIProviderError(
          `${who} returned an empty response${choice?.finish_reason ? ` (finish reason: ${choice.finish_reason})` : ''}.`,
        )
      }
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
