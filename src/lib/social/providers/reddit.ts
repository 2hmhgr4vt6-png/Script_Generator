import 'server-only'
import { env } from '@/lib/env'
import { SocialProviderError, type SocialPost, type SocialProvider, type SocialStatus } from '../types'

interface TokenCache {
  token: string
  expiresAt: number
}

let cache: TokenCache | null = null

/**
 * Reddit via the official OAuth API (application-only "client credentials"
 * grant). Only public listings are read — no private subreddits, no scraping.
 */
export class RedditProvider implements SocialProvider {
  readonly id = 'reddit'
  readonly label = 'Reddit'

  status(): SocialStatus {
    const connected = Boolean(env.redditClientId && env.redditClientSecret)
    return {
      id: this.id,
      label: this.label,
      connected,
      message: connected
        ? 'Connected. Public post search is enabled through the official Reddit API.'
        : 'Not connected — add your Reddit API credentials in Settings to enable this source.',
      docsUrl: 'https://www.reddit.com/prefs/apps',
      requiredEnv: ['REDDIT_CLIENT_ID', 'REDDIT_CLIENT_SECRET', 'REDDIT_USER_AGENT'],
    }
  }

  private async token(): Promise<string> {
    if (cache && cache.expiresAt > Date.now() + 30_000) return cache.token
    const credentials = Buffer.from(`${env.redditClientId}:${env.redditClientSecret}`).toString('base64')
    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': env.redditUserAgent,
      },
      body: 'grant_type=client_credentials',
    })
    if (response.status === 401) throw new SocialProviderError('Reddit rejected the API credentials.', 'invalid-key')
    if (!response.ok) throw new SocialProviderError(`Reddit authentication failed (${response.status}).`)
    const json = (await response.json()) as { access_token?: string; expires_in?: number }
    if (!json.access_token) throw new SocialProviderError('Reddit did not return an access token.')
    cache = { token: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000 }
    return cache.token
  }

  async discover(query: string, options: { limit?: number } = {}): Promise<SocialPost[]> {
    if (!this.status().connected) {
      throw new SocialProviderError('Reddit is not connected.', 'not-connected')
    }
    const token = await this.token()
    const url = new URL('https://oauth.reddit.com/search')
    url.searchParams.set('q', query)
    url.searchParams.set('limit', String(options.limit ?? 15))
    url.searchParams.set('sort', 'relevance')
    url.searchParams.set('t', 'year')
    url.searchParams.set('type', 'link')

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, 'User-Agent': env.redditUserAgent },
    })
    if (response.status === 429) throw new SocialProviderError('Reddit rate limit reached.', 'rate-limited')
    if (!response.ok) throw new SocialProviderError(`Reddit search failed (${response.status}).`)

    const json = (await response.json()) as {
      data?: { children?: { data: Record<string, any> }[] }
    }
    return (json.data?.children ?? []).map((child) => {
      const post = child.data
      return {
        id: `reddit:${post.id}`,
        platform: 'reddit',
        sourceName: `r/${post.subreddit}`,
        title: post.title as string,
        excerpt: String(post.selftext ?? '').slice(0, 600),
        url: `https://www.reddit.com${post.permalink}`,
        postedAt: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : null,
        score: post.score as number,
      }
    })
  }
}
