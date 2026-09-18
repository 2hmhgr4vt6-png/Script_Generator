import 'server-only'
import { SocialProviderError, type SocialPost, type SocialProvider, type SocialStatus } from '../types'

/**
 * Stack Exchange Q&A, which allows anonymous API use without a key.
 *
 * These sites are unusually well matched to Bhasika's audience: `expatriates`
 * carries visa and residence-permit questions, `academia` carries admission and
 * degree-recognition questions, and every answer is public and citable.
 */
const SITES = ['expatriates', 'academia', 'travel'] as const

export class StackExchangeProvider implements SocialProvider {
  readonly id = 'stackexchange'
  readonly label = 'Stack Exchange'

  constructor(
    private apiKey?: string,
    /** Overridable so the API can be reached through a proxy or mirror. */
    private baseUrl = 'https://api.stackexchange.com',
  ) {}

  status(): SocialStatus {
    return {
      id: this.id,
      label: this.label,
      connected: true,
      message: this.apiKey
        ? 'Connected with a Stack Apps key. Searches the Expatriates, Academia and Travel Q&A sites.'
        : 'Always on, no key needed. Anonymous use is capped per IP per day — add a free Stack Apps key to raise that cap.',
      docsUrl: 'https://stackapps.com/apps/oauth/register',
      requiredEnv: ['STACKEXCHANGE_KEY'],
    }
  }

  async verify(): Promise<void> {
    await this.discover('germany student visa', { limit: 1 })
  }

  async discover(query: string, options: { limit?: number } = {}): Promise<SocialPost[]> {
    const perSite = Math.max(3, Math.ceil((options.limit ?? 12) / SITES.length))
    const batches = await Promise.allSettled(SITES.map((site) => this.searchSite(site, query, perSite)))

    const posts: SocialPost[] = []
    const failures: string[] = []
    for (const batch of batches) {
      if (batch.status === 'fulfilled') posts.push(...batch.value)
      else failures.push(batch.reason?.message ?? 'unknown error')
    }

    // Rethrow the first failure as-is; the caller already labels it with the
    // provider name, so wrapping it again reads as "Stack Exchange: Stack
    // Exchange search failed: ...".
    if (!posts.length && failures.length) throw new SocialProviderError(failures[0])
    return posts.slice(0, options.limit ?? 12)
  }

  private async searchSite(site: string, query: string, pageSize: number): Promise<SocialPost[]> {
    const url = new URL('/2.3/search/advanced', this.baseUrl)
    url.searchParams.set('order', 'desc')
    url.searchParams.set('sort', 'relevance')
    url.searchParams.set('q', query)
    url.searchParams.set('site', site)
    url.searchParams.set('pagesize', String(Math.min(pageSize, 20)))

    if (this.apiKey) url.searchParams.set('key', this.apiKey)

    const response = await fetch(url)

    // Stack Exchange reports throttling as HTTP 400 with the reason in the body,
    // so the body is read before the status is judged.
    const json = (await response.json().catch(() => null)) as {
      items?: { title: string; link: string; creation_date: number; score: number; tags?: string[]; is_answered?: boolean }[]
      error_message?: string
      error_name?: string
      quota_remaining?: number
    } | null

    if (json?.error_name === 'throttle_violation' || /too many requests/i.test(json?.error_message ?? '')) {
      throw new SocialProviderError(
        `Stack Exchange has throttled this network. Anonymous use is capped per IP per day — ${
          this.apiKey ? 'wait for the quota to reset' : 'add a free Stack Apps key in Settings to raise the cap'
        }.`,
        'rate-limited',
      )
    }
    if (json?.error_message) throw new SocialProviderError(`Stack Exchange: ${json.error_message}`)
    if (!response.ok) throw new SocialProviderError(`Stack Exchange returned ${response.status}.`)

    return (json?.items ?? []).map((item) => ({
      id: `stackexchange:${item.link}`,
      platform: 'stackexchange',
      sourceName: `${site}.stackexchange.com`,
      title: decodeEntities(item.title),
      excerpt: `${decodeEntities(item.title)}${item.tags?.length ? ` — tagged ${item.tags.slice(0, 5).join(', ')}` : ''}${
        item.is_answered ? ' (answered)' : ' (unanswered)'
      }`,
      url: item.link,
      postedAt: item.creation_date ? new Date(item.creation_date * 1000).toISOString() : null,
      score: item.score,
    }))
  }
}

function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}
