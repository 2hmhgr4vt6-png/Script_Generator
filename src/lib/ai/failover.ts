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
    // The chain holds one entry per provider *and model*, so failures are kept
    // per provider: listing the same provider once for every model it tried
    // would bury the actual reason.
    const failures = new Map<string, string>()
    const attempts: string[] = []

    for (const provider of this.providers) {
      try {
        const result = await provider.complete(messages, options)
        this.lastUsed = provider.name
        if (attempts.length) {
          console.warn(
            `[bhasika:ai] used ${provider.name} (${provider.model}) after ${attempts.length} failed attempt(s): ${attempts.join(' | ')}`,
          )
        }
        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        attempts.push(`${provider.name}/${provider.model}: ${message}`)
        if (!failures.has(provider.name)) failures.set(provider.name, message)
      }
    }

    const summary = [...failures.entries()].map(([name, message]) => `${name}: ${message}`)
    const providerCount = failures.size

    throw new AIProviderError(
      providerCount === 1
        ? summary[0]
        : `All ${providerCount} configured AI providers failed. ${summary.join(' | ')}`,
    )
  }
}
