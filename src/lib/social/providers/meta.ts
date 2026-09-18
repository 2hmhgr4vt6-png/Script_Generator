import 'server-only'
import { env } from '@/lib/env'
import { SocialProviderError, type SocialPost, type SocialProvider, type SocialStatus } from '../types'

/**
 * Facebook and Instagram through the Meta Graph API.
 *
 * Meta does not offer public keyword search for Pages or Instagram media. What
 * an access token grants is content you own or manage, so this provider reads
 * the connected Page/Business account's own posts and comments. It is honest
 * about that limit rather than pretending to monitor the whole platform.
 */
abstract class MetaProvider implements SocialProvider {
  abstract readonly id: string
  abstract readonly label: string
  protected abstract token(): string | undefined
  protected abstract envVar: string
  protected abstract edge: string

  status(): SocialStatus {
    const connected = Boolean(this.token())
    return {
      id: this.id,
      label: this.label,
      connected,
      message: connected
        ? `Connected. Reads posts and comments from the ${this.label} account this token manages. Meta does not expose platform-wide keyword search.`
        : `Not connected — add ${this.envVar} in Settings to enable this source.`,
      docsUrl: 'https://developers.facebook.com/docs/graph-api/',
      requiredEnv: [this.envVar],
    }
  }

  async discover(query: string, options: { limit?: number } = {}): Promise<SocialPost[]> {
    const token = this.token()
    if (!token) throw new SocialProviderError(`${this.label} is not connected.`, 'not-connected')

    const url = new URL(`https://graph.facebook.com/v21.0/${this.edge}`)
    url.searchParams.set('access_token', token)
    url.searchParams.set('limit', String(options.limit ?? 25))

    const response = await fetch(url)
    if (response.status === 400 || response.status === 401) {
      throw new SocialProviderError(`${this.label} rejected the access token.`, 'invalid-key')
    }
    if (!response.ok) throw new SocialProviderError(`${this.label} request failed (${response.status}).`)

    const json = (await response.json()) as { data?: Record<string, any>[] }
    const term = query.toLowerCase()
    return (json.data ?? [])
      .map((item) => {
        const text = String(item.message ?? item.caption ?? item.text ?? '')
        return {
          id: `${this.id}:${item.id}`,
          platform: this.id,
          sourceName: this.label,
          title: text.split('\n')[0]?.slice(0, 120) || `${this.label} post`,
          excerpt: text.slice(0, 600),
          url: String(item.permalink_url ?? item.permalink ?? `https://facebook.com/${item.id}`),
          postedAt: (item.created_time ?? item.timestamp ?? null) as string | null,
        }
      })
      .filter((post) => !term || post.excerpt.toLowerCase().includes(term) || post.title.toLowerCase().includes(term))
  }
}

export class FacebookProvider extends MetaProvider {
  readonly id = 'facebook'
  readonly label = 'Facebook'
  protected envVar = 'FACEBOOK_ACCESS_TOKEN'
  protected edge = 'me/feed?fields=id,message,permalink_url,created_time'
  protected token() {
    return env.facebookAccessToken
  }
}

export class InstagramProvider extends MetaProvider {
  readonly id = 'instagram'
  readonly label = 'Instagram'
  protected envVar = 'INSTAGRAM_ACCESS_TOKEN'
  protected edge = 'me/media?fields=id,caption,permalink,timestamp'
  protected token() {
    return env.instagramAccessToken
  }
}
