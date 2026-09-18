export interface SearchResult {
  title: string
  url: string
  snippet: string
  publishedAt?: string | null
  score?: number
}

export interface SearchOptions {
  limit?: number
  /** Restrict results to these domains where the provider supports it. */
  includeDomains?: string[]
  days?: number
}

export interface SearchProvider {
  readonly name: string
  readonly isLive: boolean
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>
}

export class SearchProviderError extends Error {
  constructor(
    message: string,
    readonly code: 'missing-key' | 'invalid-key' | 'rate-limited' | 'timeout' | 'upstream' = 'upstream',
  ) {
    super(message)
    this.name = 'SearchProviderError'
  }
}
