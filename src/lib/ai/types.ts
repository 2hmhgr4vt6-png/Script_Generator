export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface CompletionOptions {
  system?: string
  temperature?: number
  maxTokens?: number
  /** Ask the provider for a JSON object response where the provider supports it. */
  json?: boolean
}

export interface AIProvider {
  readonly name: string
  readonly model: string
  /** False for the mock provider — callers must label its output as sample data. */
  readonly isLive: boolean
  complete(messages: AIMessage[], options?: CompletionOptions): Promise<string>
}

export class AIProviderError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'missing-key'
      | 'rate-limited'
      | 'invalid-key'
      | 'timeout'
      | 'upstream'
      | 'json-mode-unsupported' = 'upstream',
  ) {
    super(message)
    this.name = 'AIProviderError'
  }
}
