import 'server-only'
import { AIProviderError, type AIMessage, type AIProvider, type CompletionOptions } from '../types'

/** Works against the OpenAI API or any OpenAI-compatible endpoint (OPENAI_BASE_URL). */
export class OpenAIProvider implements AIProvider {
  readonly name = 'openai'
  readonly isLive = true

  constructor(
    private apiKey: string,
    readonly model: string,
    private baseUrl: string,
  ) {}

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
      if (response.status === 401) throw new AIProviderError('The OpenAI API key was rejected.', 'invalid-key')
      if (response.status === 429) throw new AIProviderError('OpenAI rate limit reached. Try again shortly.', 'rate-limited')
      if (!response.ok) {
        const detail = await response.text()
        throw new AIProviderError(`OpenAI request failed (${response.status}): ${detail.slice(0, 200)}`)
      }
      const json = (await response.json()) as { choices?: { message?: { content?: string } }[] }
      const content = json.choices?.[0]?.message?.content
      if (!content) throw new AIProviderError('OpenAI returned an empty response.')
      return content
    } catch (error) {
      if (error instanceof AIProviderError) throw error
      if ((error as Error).name === 'AbortError') throw new AIProviderError('The AI request timed out.', 'timeout')
      throw new AIProviderError((error as Error).message)
    } finally {
      clearTimeout(timeout)
    }
  }
}
