import 'server-only'
import { SocialProviderError, type SocialPost, type SocialProvider, type SocialStatus } from '../types'

interface TokenCache {
  token: string
  expiresAt: number
}

/** Tokens are cached per client id, so rotating a credential invalidates its token. */
const tokenCache = new Map<string, TokenCache>()

const DEFAULT_USER_AGENT = 'bhasika-content-studio/1.0'

/**
 * Reddit via the official OAuth API (application-only "client credentials"
 * grant). Only public listings are read — no private subreddits, no scraping.
 */
export class RedditProvider implements SocialProvider {
  readonly id = 'reddit'
  readonly label = 'Reddit'

  constructor(
    private clientId: string | undefined,
    private clientSecret: string | undefined,
    private userAgent: string = DEFAULT_USER_AGENT,
  ) {}

  status(): SocialStatus {
    const connected = Boolean(this.clientId && this.clientSecret)
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
    const cached = tokenCache.get(this.clientId!)
    if (cached && cached.expiresAt > Date.now() + 30_000) return cached.token

    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')
    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': this.userAgent,
      },
      body: 'grant_type=client_credentials',
    })
    // Reddit answers bad client credentials with 401 or 403 depending on the endpoint.
    if (response.status === 401 || response.status === 403) {
      throw new SocialProviderError(
        'Reddit rejected the client ID or secret. Check that the app type is "script" and the values are not swapped.',
        'invalid-key',
      )
    }
    if (!response.ok) throw new SocialProviderError(`Reddit authentication failed (${response.status}).`)

    const json = (await response.json()) as { access_token?: string; expires_in?: number }
    if (!json.access_token) throw new SocialProviderError('Reddit did not return an access token.')
    tokenCache.set(this.clientId!, {
      token: json.access_token,
      expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
    })
    return json.access_token
  }

  /** Authenticates without searching — used by the "Test" button in Settings. */
  async verify(): Promise<void> {
    if (!this.status().connected) throw new SocialProviderError('Reddit is not connected.', 'not-connected')
    await this.token()
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
      headers: { Authorization: `Bearer ${token}`, 'User-Agent': this.userAgent },
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
