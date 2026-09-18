import 'server-only'
import { SocialProviderError, type SocialPost, type SocialProvider, type SocialStatus } from '../types'

interface YouTubeVideo {
  id: string
  snippet: { title: string; description?: string; publishedAt?: string; channelTitle: string }
  statistics?: { viewCount?: string; likeCount?: string; commentCount?: string }
}

function numeric(value: string | undefined): number | null {
  if (value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/** Public video search through the official YouTube Data API v3. */
export class YouTubeProvider implements SocialProvider {
  readonly id = 'youtube'
  readonly label = 'YouTube'

  constructor(
    private apiKey: string | undefined,
    /** Overridable so the API can be reached through a proxy or mirror. */
    private baseUrl = 'https://www.googleapis.com/youtube/v3',
  ) {}

  status(): SocialStatus {
    const connected = Boolean(this.apiKey)
    return {
      id: this.id,
      label: this.label,
      connected,
      message: connected
        ? 'Connected. Public video search is enabled through the YouTube Data API.'
        : 'Not connected — add YOUTUBE_API_KEY in Settings to enable this source.',
      docsUrl: 'https://developers.google.com/youtube/v3/getting-started',
      requiredEnv: ['YOUTUBE_API_KEY'],
    }
  }

  async verify(): Promise<void> {
    await this.discover('germany student visa', { limit: 1 })
  }

  /**
   * Search results enriched with view, like and comment counts.
   *
   * search.list does not return statistics, so the ids are passed to
   * videos.list in one batched call — 100 quota units for the search plus 1
   * for the batch, which the free daily quota absorbs easily.
   */
  async searchWithStats(
    query: string,
    options: { limit?: number } = {},
  ): Promise<(SocialPost & { views: number | null; likes: number | null; comments: number | null })[]> {
    const posts = await this.discover(query, options)
    if (!posts.length) return []

    const ids = posts.map((post) => post.id.replace('youtube:', ''))
    const stats = await this.videoStats(ids)

    return posts.map((post) => {
      const entry = stats.get(post.id.replace('youtube:', ''))
      return {
        ...post,
        views: entry?.views ?? null,
        likes: entry?.likes ?? null,
        comments: entry?.comments ?? null,
      }
    })
  }

  /** The platform's own "most popular right now" chart for a country. */
  async trending(regionCode: string, limit = 15): Promise<
    (SocialPost & { views: number | null; likes: number | null; comments: number | null })[]
  > {
    if (!this.apiKey) throw new SocialProviderError('YouTube is not connected.', 'not-connected')

    const url = new URL(`${this.baseUrl}/videos`)
    url.searchParams.set('key', this.apiKey)
    url.searchParams.set('part', 'snippet,statistics')
    url.searchParams.set('chart', 'mostPopular')
    url.searchParams.set('regionCode', regionCode)
    url.searchParams.set('maxResults', String(Math.min(limit, 25)))

    const response = await fetch(url)
    if (response.status === 403) {
      throw new SocialProviderError('YouTube rejected the API key, or the daily quota is exhausted.', 'invalid-key')
    }
    if (response.status === 400) {
      throw new SocialProviderError(`YouTube does not publish a chart for region "${regionCode}".`)
    }
    if (!response.ok) throw new SocialProviderError(`YouTube trending failed (${response.status}).`)

    const json = (await response.json()) as { items?: YouTubeVideo[] }
    return (json.items ?? []).map((item) => ({
      id: `youtube:${item.id}`,
      platform: 'youtube',
      sourceName: item.snippet.channelTitle,
      title: item.snippet.title,
      excerpt: (item.snippet.description ?? '').slice(0, 400),
      url: `https://www.youtube.com/watch?v=${item.id}`,
      postedAt: item.snippet.publishedAt ?? null,
      views: numeric(item.statistics?.viewCount),
      likes: numeric(item.statistics?.likeCount),
      comments: numeric(item.statistics?.commentCount),
    }))
  }

  private async videoStats(
    ids: string[],
  ): Promise<Map<string, { views: number | null; likes: number | null; comments: number | null }>> {
    const out = new Map<string, { views: number | null; likes: number | null; comments: number | null }>()
    if (!this.apiKey || !ids.length) return out

    const url = new URL(`${this.baseUrl}/videos`)
    url.searchParams.set('key', this.apiKey)
    url.searchParams.set('part', 'statistics')
    url.searchParams.set('id', ids.slice(0, 50).join(','))

    const response = await fetch(url)
    if (!response.ok) return out

    const json = (await response.json()) as { items?: YouTubeVideo[] }
    for (const item of json.items ?? []) {
      out.set(item.id, {
        views: numeric(item.statistics?.viewCount),
        likes: numeric(item.statistics?.likeCount),
        comments: numeric(item.statistics?.commentCount),
      })
    }
    return out
  }

  async discover(query: string, options: { limit?: number } = {}): Promise<SocialPost[]> {
    if (!this.apiKey) throw new SocialProviderError('YouTube is not connected.', 'not-connected')

    const url = new URL(`${this.baseUrl}/search`)
    url.searchParams.set('key', this.apiKey)
    url.searchParams.set('q', query)
    url.searchParams.set('part', 'snippet')
    url.searchParams.set('type', 'video')
    url.searchParams.set('maxResults', String(Math.min(options.limit ?? 10, 25)))

    const response = await fetch(url)
    if (response.status === 403) {
      throw new SocialProviderError('YouTube rejected the API key, or the daily quota is exhausted.', 'invalid-key')
    }
    if (response.status === 400) {
      throw new SocialProviderError('YouTube rejected the request — check that the key is a Data API v3 key.', 'invalid-key')
    }
    if (!response.ok) throw new SocialProviderError(`YouTube search failed (${response.status}).`)

    const json = (await response.json()) as {
      items?: { id: { videoId: string }; snippet: { title: string; description: string; publishedAt: string; channelTitle: string } }[]
    }
    return (json.items ?? []).map((item) => ({
      id: `youtube:${item.id.videoId}`,
      platform: 'youtube',
      sourceName: item.snippet.channelTitle,
      title: item.snippet.title,
      excerpt: item.snippet.description,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      postedAt: item.snippet.publishedAt,
    }))
  }
}
