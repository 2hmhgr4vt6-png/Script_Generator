import 'server-only'
import type { SearchProvider } from '@/lib/search'
import { SocialProviderError, type SocialPost, type SocialProvider, type SocialStatus } from '../types'

/**
 * TikTok, reached through public web search rather than an API.
 *
 * TikTok's Research API is restricted to academic and non-profit researchers —
 * commercial users are explicitly ineligible — and there is no public search
 * endpoint. What is available is that TikTok's pages are indexed by search
 * engines, so the configured search provider can find them.
 *
 * That yields real video URLs, captions and TikTok's own topic hub pages. It
 * does not yield view or like counts: those are only on the page itself, and
 * reading them would mean scraping. This provider does not do that.
 */
export class TikTokProvider implements SocialProvider {
  readonly id = 'tiktok'
  readonly label = 'TikTok'

  constructor(private search: SearchProvider | null) {}

  status(): SocialStatus {
    const connected = Boolean(this.search)
    return {
      id: this.id,
      label: this.label,
      connected,
      message: connected
        ? 'Connected through web search. Finds TikTok videos and topic pages; view counts are not available without scraping, which this does not do.'
        : 'Needs the web search provider — TikTok has no public API, so it is reached through search. Add a search key in Settings.',
      docsUrl: 'https://developers.tiktok.com/products/research-api',
      requiredEnv: ['SEARCH_API_KEY'],
    }
  }

  async verify(): Promise<void> {
    const results = await this.discover('study in germany', { limit: 1 })
    if (!results.length) throw new SocialProviderError('Search returned no TikTok results for a test query.')
  }

  async discover(query: string, options: { limit?: number } = {}): Promise<SocialPost[]> {
    if (!this.search) {
      throw new SocialProviderError('TikTok needs a search provider. Add a search API key in Settings.', 'not-connected')
    }

    const results = await this.search.search(query, {
      limit: options.limit ?? 12,
      includeDomains: ['tiktok.com'],
    })

    return results
      .filter((result) => result.url.includes('tiktok.com'))
      .map((result) => ({
        id: `tiktok:${result.url}`,
        platform: 'tiktok',
        sourceName: creatorFrom(result.url) ?? 'TikTok',
        title: cleanTitle(result.title),
        excerpt: result.snippet.slice(0, 600),
        url: result.url,
        postedAt: result.publishedAt ?? null,
      }))
  }

  /**
   * TikTok's own `/discover/` hub pages, which exist for topics people search
   * on TikTok — a usable read on what the platform itself considers a topic.
   */
  async topics(query: string, limit = 12): Promise<SocialPost[]> {
    const posts = await this.discover(`${query} tiktok discover`, { limit: limit * 2 })
    return posts.filter((post) => post.url.includes('/discover/')).slice(0, limit)
  }
}

/** "@rpa_vlog" from a TikTok video URL, where the URL carries one. */
function creatorFrom(url: string): string | null {
  const match = url.match(/tiktok\.com\/(@[^/?#]+)/)
  return match ? `TikTok · ${match[1]}` : null
}

/** Search engines append "| TikTok" to page titles; it adds nothing here. */
function cleanTitle(title: string): string {
  return title.replace(/\s*\|\s*TikTok\s*$/i, '').trim()
}
