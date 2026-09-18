import 'server-only'
import { OpenAIProvider } from './providers/openai'
import { AIProviderError, type AIMessage, type AIProvider, type CompletionOptions } from './types'

/**
 * Picks a usable chat model from a provider's own model list.
 *
 * Preference order favours the small fast models that free tiers actually
 * serve, and skips anything that is plainly not a chat model.
 */
export function chooseModel(models: string[], hint?: string): string | undefined {
  const usable = models.filter(
    (id) => !/embed|whisper|tts|image|vision-only|moderation|rerank|guard/i.test(id),
  )
  if (!usable.length) return undefined

  const preferred = [hint, 'flash', 'mini', 'instant', '8b', 'haiku', 'small'].filter(Boolean) as string[]
  for (const term of preferred) {
    const match = usable.find((id) => id.toLowerCase().includes(term.toLowerCase()))
    if (match) return match
  }
  return usable[0]
}

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
  /** Models found by asking a provider what it serves, keyed by provider name. */
  readonly discoveredModels = new Map<string, string>()
  /** Every attempt from the most recent call, for diagnostics. */
  lastAttempts: string[] = []

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
    const discovered = new Set<string>()

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

        // The configured model does not exist on this account. Rather than rely
        // on a guessed fallback list, ask the provider what it actually serves
        // and try that once.
        if (
          error instanceof AIProviderError &&
          error.code === 'model-not-found' &&
          provider instanceof OpenAIProvider &&
          !discovered.has(provider.name)
        ) {
          discovered.add(provider.name)
          try {
            const models = await provider.listModels()
            const candidate = chooseModel(models)
            if (candidate && candidate !== provider.model) {
              const result = await provider.withModel(candidate).complete(messages, options)
              this.lastUsed = provider.name
              this.discoveredModels.set(provider.name, candidate)
              console.warn(
                `[bhasika:ai] ${provider.name} does not serve "${provider.model}"; used "${candidate}" from its model list instead.`,
              )
              return result
            }
          } catch (discoveryError) {
            attempts.push(
              `${provider.name}/model-discovery: ${
                discoveryError instanceof Error ? discoveryError.message : String(discoveryError)
              }`,
            )
          }
        }
      }
    }

    this.lastAttempts = attempts
    const summary = [...failures.entries()].map(([name, message]) => `${name}: ${message}`)
    const providerCount = failures.size

    throw new AIProviderError(
      providerCount === 1
        ? summary[0]
        : `All ${providerCount} configured AI providers failed. ${summary.join(' | ')}`,
      'upstream',
      attempts,
    )
  }
}
