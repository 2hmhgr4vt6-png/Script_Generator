import 'server-only'
import type { TrendItem } from './types'

/**
 * Google Trends publishes a daily trending-searches feed per country as RSS,
 * with no key and no account. It is the only free, official-ish source of
 * "what is a whole country searching for right now".
 */
export async function fetchGoogleTrends(region: string, baseUrl?: string): Promise<TrendItem[]> {
  const url = new URL('/trending/rss', baseUrl ?? 'https://trends.google.com')
  url.searchParams.set('geo', region)

  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; bhasika-content-studio/1.0)' },
  })
  if (!response.ok) throw new Error(`Google Trends returned ${response.status} for region ${region}.`)

  return parseTrendsRss(await response.text())
}

function parseTrendsRss(xml: string): TrendItem[] {
  const items: TrendItem[] = []
  const pattern = /<item>([\s\S]*?)<\/item>/g
  let match: RegExpExecArray | null

  while ((match = pattern.exec(xml)) !== null) {
    const block = match[1]
    const title = decode(tag(block, 'title'))
    if (!title) continue

    const volume = decode(tag(block, 'ht:approx_traffic')) || null
    items.push({
      id: `google-trends:${title}`,
      source: 'google-trends',
      title,
      url: `https://www.google.com/search?q=${encodeURIComponent(title)}`,
      volume,
      volumeValue: parseVolume(volume),
      capturedAt: new Date().toISOString(),
      // The feed lists the news items that drove the trend, which explain it.
      relatedQueries: [...block.matchAll(/<ht:news_item_title>([\s\S]*?)<\/ht:news_item_title>/g)]
        .map((m) => decode(m[1]))
        .filter(Boolean)
        .slice(0, 3),
    })
  }
  return items
}

/** "5000+" -> 5000, so trends can be ordered by size. */
function parseVolume(volume: string | null): number | null {
  if (!volume) return null
  const digits = volume.replace(/[^0-9]/g, '')
  return digits ? Number(digits) : null
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

/**
 * Ranks items against the others in the same scan, on the same platform.
 *
 * Raw counts are not comparable across platforms — a 500-upvote Reddit post and
 * a 500-view video mean very different things — so each item is scored by where
 * it falls among its peers in this scan.
 */
export function relativePerformance(values: (number | null)[]): number[] {
  const known = values.filter((value): value is number => typeof value === 'number')
  if (known.length < 2) return values.map(() => 50)

  const sorted = [...known].sort((a, b) => a - b)
  return values.map((value) => {
    if (typeof value !== 'number') return 50
    const below = sorted.filter((entry) => entry < value).length
    return Math.round((below / (sorted.length - 1)) * 100)
  })
}
