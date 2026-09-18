import 'server-only'
import { AIProviderError, type AIMessage, type AIProvider, type CompletionOptions } from './types'

/**
 * Tries each configured provider in turn.
 *
 * Free tiers are rate-limited by the minute and by the day, so the realistic
 * failure is not "the key is wrong" but "this one is busy right now". Falling
 * through to the next configured provider turns that into a slower answer
 * instead of a failed one.
 */
export class FailoverAIProvider implements AIProvider {
  readonly isLive = true
  /** The provider actually used by the most recent successful call. */
  lastUsed: string

  constructor(readonly providers: AIProvider[]) {
    if (!providers.length) throw new Error('FailoverAIProvider needs at least one provider')
    this.lastUsed = providers[0].name
  }

  get name(): string {
    return this.providers[0].name
  }

  get model(): string {
    return this.providers[0].model
  }

  get available(): string[] {
    return this.providers.map((provider) => provider.name)
  }

  async complete(messages: AIMessage[], options: CompletionOptions = {}): Promise<string> {
    const failures: string[] = []

    for (const provider of this.providers) {
      try {
        const result = await provider.complete(messages, options)
        this.lastUsed = provider.name
        if (failures.length) {
          console.warn(`[bhasika:ai] fell back to ${provider.name} after: ${failures.join(' | ')}`)
        }
        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        failures.push(`${provider.name}: ${message}`)
      }
    }

    throw new AIProviderError(
      this.providers.length === 1
        ? failures[0]
        : `All ${this.providers.length} configured AI providers failed. ${failures.join(' | ')}`,
    )
  }
}
