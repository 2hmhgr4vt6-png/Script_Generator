import 'server-only'
import { SearchProviderError, type SearchOptions, type SearchProvider, type SearchResult } from '../types'

/** Google results via Serper.dev. */
export class SerperProvider implements SearchProvider {
  readonly name = 'serper'
  readonly isLive = true

  constructor(private apiKey: string) {}

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const scoped = options.includeDomains?.length
      ? `${query} (${options.includeDomains.map((d) => `site:${d}`).join(' OR ')})`
      : query

    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': this.apiKey },
      body: JSON.stringify({ q: scoped, num: options.limit ?? 8 }),
    })
    if (response.status === 401 || response.status === 403) {
      throw new SearchProviderError('The Serper API key was rejected.', 'invalid-key')
    }
    if (response.status === 429) throw new SearchProviderError('Serper rate limit reached.', 'rate-limited')
    if (!response.ok) throw new SearchProviderError(`Serper search failed (${response.status}).`)

    const json = (await response.json()) as {
      organic?: { title: string; link: string; snippet?: string; date?: string }[]
    }
    return (json.organic ?? []).map((r) => ({
      title: r.title,
      url: r.link,
      snippet: r.snippet ?? '',
      publishedAt: r.date ?? null,
    }))
  }
}
