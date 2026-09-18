import 'server-only'
import { getAIProvider, parseJson } from '@/lib/ai'
import { workspaceCredentials } from '@/lib/credentials'
import { getStore, newId, now } from '@/lib/db'
import { BHASIKA_SYSTEM } from '@/lib/scripts/prompts'
import { buildSocialProviders } from '@/lib/social'
import { YouTubeProvider } from '@/lib/social/providers/youtube'
import { fetchGoogleTrends } from './sources'
import type { TrendAngle, TrendItem, TrendScan } from './types'

export interface TrendScanInput {
  userId: string
  region?: string
}

/**
 * Collects what a country is paying attention to right now, then works out
 * which of it Bhasika could honestly use.
 *
 * Sources are limited to platforms that publish a trending list: Google Trends
 * (keyless, per country) and YouTube's most-popular chart. TikTok and Instagram
 * publish no such API, so their hashtag trends are not available here.
 */
export async function runTrendScan(input: TrendScanInput): Promise<TrendScan> {
  const store = await getStore()
  const region = input.region || 'NP'
  const credentials = await workspaceCredentials()
  const notes: string[] = []
  const trends: TrendItem[] = []

  try {
    trends.push(...(await fetchGoogleTrends(region, credentials.get('GOOGLE_TRENDS_BASE_URL'))))
  } catch (error) {
    notes.push(`Google Trends: ${(error as Error).message}`)
  }

  const youtube = buildSocialProviders(credentials).find(
    (p): p is YouTubeProvider => p instanceof YouTubeProvider,
  )
  if (youtube?.status().connected) {
    try {
      const videos = await youtube.trending(region, 15)
      trends.push(
        ...videos.map((video) => ({
          id: video.id,
          source: 'youtube' as const,
          title: video.title,
          url: video.url,
          volume: video.views !== null ? `${video.views.toLocaleString()} views` : null,
          volumeValue: video.views,
          capturedAt: now(),
          relatedQueries: [video.sourceName].filter(Boolean),
        })),
      )
    } catch (error) {
      notes.push(`YouTube trending: ${(error as Error).message}`)
    }
  } else {
    notes.push('YouTube is not connected — add a free key in Settings to include its trending chart.')
  }

  notes.push(
    'TikTok and Instagram publish no trending API, so their hashtag trends cannot be included. What is here is Google search trends and, when connected, YouTube.',
  )

  trends.sort((a, b) => (b.volumeValue ?? 0) - (a.volumeValue ?? 0))

  const ai = await getAIProvider()
  let angles: TrendAngle[] = []
  let summary = ''

  if (!trends.length) {
    summary = 'No trend data could be collected. Check the source notes below.'
  } else if (ai) {
    const result = await deriveAngles(ai, trends, region)
    angles = result.angles
    summary = result.summary
  } else {
    summary = `${trends.length} trends captured. Connect an AI provider to turn them into Bhasika content angles.`
  }

  const scan: TrendScan = {
    id: newId(),
    user_id: input.userId,
    region,
    created_at: now(),
    is_demo: false,
    trends: trends.slice(0, 40),
    angles,
    summary,
    source_notes: notes,
  }

  await store.insert('trend_scans', scan)
  return scan
}

async function deriveAngles(
  ai: NonNullable<Awaited<ReturnType<typeof getAIProvider>>>,
  trends: TrendItem[],
  region: string,
): Promise<{ angles: TrendAngle[]; summary: string }> {
  const list = trends
    .slice(0, 25)
    .map((trend) => `- ${trend.title}${trend.volume ? ` (${trend.volume})` : ''}${
      trend.relatedQueries.length ? ` — context: ${trend.relatedQueries.join('; ')}` : ''
    }`)
    .join('\n')

  const raw = await ai.complete(
    [
      {
        role: 'user',
        content: `These are the things people in ${region} are searching for and watching right now:

${list}

Bhasika is a student guidance platform for Nepali students looking at Germany — admission, visas, ECTS, costs, student jobs, careers. Its promise is "We explain. You decide."

Work out which of these trends Bhasika could genuinely use, and how.

Rules:
- Most trends will be irrelevant. Say so by leaving them out rather than forcing a connection. Five strong angles beat twenty weak ones.
- Mark each angle's relevance honestly: "direct" (the trend is already about study, migration or careers), "adaptable" (a format or framing Bhasika can borrow), "stretch" (only works with a clear, non-cringe link).
- Never suggest riding a tragedy, disaster, death, crime or political conflict. If a trend is one of those, leave it out.
- The idea must still teach something true about studying in Germany. Bhasika does not post empty trend-chasing.
- Where an angle risks looking forced or opportunistic, say so in "caution".

Respond as JSON:
{
  "angles": [
    {
      "trend": "the trend being used",
      "relevance": "direct|adaptable|stretch",
      "idea": "the content idea in one or two sentences",
      "hook": "a 3-5 second opening line, in the language that fits the audience",
      "why": "why this connection works for Bhasika's audience",
      "caution": "what could go wrong, or null"
    }
  ],
  "summary": "2-3 sentences on what is worth acting on this week"
}`,
      },
    ],
    { system: BHASIKA_SYSTEM, json: true, temperature: 0.7, maxTokens: 2600 },
  )

  const parsed = parseJson<{ angles?: TrendAngle[]; summary?: string }>(raw)
  return {
    angles: (parsed.angles ?? []).map((angle) => ({
      trend: angle.trend,
      relevance: (['direct', 'adaptable', 'stretch'] as const).includes(angle.relevance)
        ? angle.relevance
        : 'stretch',
      idea: angle.idea,
      hook: angle.hook,
      why: angle.why,
      caution: angle.caution ?? null,
    })),
    summary: parsed.summary ?? '',
  }
}

export async function listTrendScans(userId: string, limit = 20): Promise<TrendScan[]> {
  const store = await getStore()
  return store.list<TrendScan>('trend_scans', { where: { user_id: userId }, limit })
}

export async function getTrendScan(userId: string, id: string): Promise<TrendScan | null> {
  const store = await getStore()
  const scan = await store.get<TrendScan>('trend_scans', id)
  return scan && scan.user_id === userId ? scan : null
}
