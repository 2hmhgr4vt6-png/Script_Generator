import 'server-only'
import { AIProviderError, type AIMessage, type AIProvider, type CompletionOptions } from '../types'

export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic'
  readonly isLive = true

  constructor(
    private apiKey: string,
    readonly model: string,
  ) {}

  async complete(messages: AIMessage[], options: CompletionOptions = {}): Promise<string> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 90_000)
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: options.maxTokens ?? 2000,
          temperature: options.temperature ?? 0.7,
          system: options.system,
          messages: messages
            .filter((m) => m.role !== 'system')
            .map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: controller.signal,
      })
      if (response.status === 401) throw new AIProviderError('The Anthropic API key was rejected.', 'invalid-key')
      if (response.status === 429) throw new AIProviderError('Anthropic rate limit reached. Try again shortly.', 'rate-limited')
      if (!response.ok) {
        const detail = await response.text()
        throw new AIProviderError(`Anthropic request failed (${response.status}): ${detail.slice(0, 200)}`)
      }
      const json = (await response.json()) as { content?: { type: string; text?: string }[] }
      const text = json.content?.filter((b) => b.type === 'text').map((b) => b.text ?? '').join('\n')
      if (!text) throw new AIProviderError('Anthropic returned an empty response.')
      return text
    } catch (error) {
      if (error instanceof AIProviderError) throw error
      if ((error as Error).name === 'AbortError') throw new AIProviderError('The AI request timed out.', 'timeout')
      throw new AIProviderError((error as Error).message)
    } finally {
      clearTimeout(timeout)
    }
  }
}
