import 'server-only'
import { SearchProviderError, type SearchOptions, type SearchProvider, type SearchResult } from '../types'

export class TavilyProvider implements SearchProvider {
  readonly name = 'tavily'
  readonly isLive = true

  constructor(
    private apiKey: string,
    /** Overridable so the API can be reached through a proxy or mirror. */
    private baseUrl = 'https://api.tavily.com',
  ) {}

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const response = await fetch(`${this.baseUrl}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: this.apiKey,
        query,
        max_results: options.limit ?? 8,
        search_depth: 'advanced',
        include_domains: options.includeDomains,
        days: options.days,
      }),
    })
    if (response.status === 401 || response.status === 403) {
      throw new SearchProviderError('The Tavily API key was rejected.', 'invalid-key')
    }
    if (response.status === 429) throw new SearchProviderError('Tavily rate limit reached.', 'rate-limited')
    if (!response.ok) throw new SearchProviderError(`Tavily search failed (${response.status}).`)

    const json = (await response.json()) as {
      results?: { title: string; url: string; content: string; published_date?: string; score?: number }[]
    }
    return (json.results ?? []).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.content,
      publishedAt: r.published_date ?? null,
      score: r.score,
    }))
  }
}
