import 'server-only'
import { SearchProviderError, type SearchOptions, type SearchProvider, type SearchResult } from '../types'

export class ExaProvider implements SearchProvider {
  readonly name = 'exa'
  readonly isLive = true

  constructor(private apiKey: string) {}

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': this.apiKey },
      body: JSON.stringify({
        query,
        numResults: options.limit ?? 8,
        includeDomains: options.includeDomains,
        contents: { text: { maxCharacters: 600 } },
        type: 'auto',
      }),
    })
    if (response.status === 401 || response.status === 403) {
      throw new SearchProviderError('The Exa API key was rejected.', 'invalid-key')
    }
    if (response.status === 429) throw new SearchProviderError('Exa rate limit reached.', 'rate-limited')
    if (!response.ok) throw new SearchProviderError(`Exa search failed (${response.status}).`)

    const json = (await response.json()) as {
      results?: { title?: string; url: string; text?: string; publishedDate?: string; score?: number }[]
    }
    return (json.results ?? []).map((r) => ({
      title: r.title ?? r.url,
      url: r.url,
      snippet: (r.text ?? '').slice(0, 600),
      publishedAt: r.publishedDate ?? null,
      score: r.score,
    }))
  }
}
