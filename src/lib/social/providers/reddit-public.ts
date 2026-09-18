import 'server-only'
import { SocialProviderError, type SocialPost, type SocialProvider, type SocialStatus } from '../types'

const USER_AGENT = 'bhasika-content-studio/1.0 (audience research)'

/**
 * Reddit's public search feed, which needs no credentials at all.
 *
 * This is the same public search page anyone can open in a browser, served as
 * Atom. It is rate-limited and returns less metadata than the OAuth API, so the
 * authenticated Reddit provider is preferred when credentials exist — but this
 * means problem discovery works the moment the studio is installed.
 */
export class RedditPublicProvider implements SocialProvider {
  readonly id = 'reddit-public'
  readonly label = 'Reddit (public feed)'

  /** Overridable so the feed can be read through a mirror or proxy. */
  constructor(private baseUrl = 'https://www.reddit.com') {}

  status(): SocialStatus {
    return {
      id: this.id,
      label: this.label,
      connected: true,
      message:
        'Always on. Reads Reddit\'s public search feed, which needs no credentials. Add Reddit API keys for higher limits and richer results.',
      docsUrl: 'https://www.reddit.com/search',
      requiredEnv: [],
    }
  }

  async verify(): Promise<void> {
    await this.discover('study in germany', { limit: 1 })
  }

  async discover(query: string, options: { limit?: number } = {}): Promise<SocialPost[]> {
    const url = new URL('/search.rss', this.baseUrl)
    url.searchParams.set('q', query)
    url.searchParams.set('sort', 'relevance')
    url.searchParams.set('t', 'year')
    url.searchParams.set('limit', String(Math.min(options.limit ?? 15, 25)))

    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
    if (response.status === 429) {
      throw new SocialProviderError('Reddit is rate-limiting the public feed. Try again shortly.', 'rate-limited')
    }
    if (!response.ok) throw new SocialProviderError(`Reddit public feed failed (${response.status}).`)

    return parseAtom(await response.text()).slice(0, options.limit ?? 15)
  }
}

interface AtomEntry {
  title: string
  link: string
  content: string
  updated: string | null
  author: string | null
}

/**
 * Minimal Atom reader.
 *
 * Reddit's feed is small and regular, so a targeted parse avoids adding an XML
 * dependency. Anything it cannot read is skipped rather than throwing.
 */
function parseAtom(xml: string): SocialPost[] {
  const entries: AtomEntry[] = []
  const entryPattern = /<entry>([\s\S]*?)<\/entry>/g
  let match: RegExpExecArray | null

  while ((match = entryPattern.exec(xml)) !== null) {
    const block = match[1]
    const title = decode(tag(block, 'title'))
    const link = (block.match(/<link[^>]*href="([^"]+)"/) ?? [])[1] ?? ''
    if (!title || !link) continue
    entries.push({
      title,
      link: decode(link),
      content: decode(tag(block, 'content')),
      updated: tag(block, 'updated') || null,
      author: decode(tag(block, 'name')) || null,
    })
  }

  return entries.map((entry) => ({
    id: `reddit-public:${entry.link}`,
    platform: 'reddit',
    sourceName: entry.author ? `Reddit · ${entry.author}` : 'Reddit',
    title: entry.title,
    // Feed content is HTML; strip it back to the text a researcher reads.
    excerpt: entry.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 600),
    url: entry.link,
    postedAt: entry.updated,
  }))
}

function tag(block: string, name: string): string {
  const match = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))
  return match ? match[1].trim() : ''
}

function decode(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .trim()
}
