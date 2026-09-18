import 'server-only'
import { env } from '@/lib/env'
import { SocialProviderError, type SocialPost, type SocialProvider, type SocialStatus } from '../types'

/** Public video search through the official YouTube Data API v3. */
export class YouTubeProvider implements SocialProvider {
  readonly id = 'youtube'
  readonly label = 'YouTube'

  status(): SocialStatus {
    const connected = Boolean(env.youtubeApiKey)
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

  async discover(query: string, options: { limit?: number } = {}): Promise<SocialPost[]> {
    if (!env.youtubeApiKey) throw new SocialProviderError('YouTube is not connected.', 'not-connected')

    const url = new URL('https://www.googleapis.com/youtube/v3/search')
    url.searchParams.set('key', env.youtubeApiKey)
    url.searchParams.set('q', query)
    url.searchParams.set('part', 'snippet')
    url.searchParams.set('type', 'video')
    url.searchParams.set('maxResults', String(Math.min(options.limit ?? 10, 25)))

    const response = await fetch(url)
    if (response.status === 403) {
      throw new SocialProviderError('YouTube rejected the API key or the quota is exhausted.', 'invalid-key')
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
