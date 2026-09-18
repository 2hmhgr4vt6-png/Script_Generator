import 'server-only'
import { getAIProvider, parseJson } from '@/lib/ai'
import { getStore, newId, now } from '@/lib/db'
import { BHASIKA_SYSTEM } from '@/lib/scripts/prompts'
import { buildSocialProviders } from '@/lib/social'
import { StackExchangeProvider } from '@/lib/social/providers/stackexchange'
import { YouTubeProvider } from '@/lib/social/providers/youtube'
import { workspaceCredentials } from '@/lib/credentials'
import { relativePerformance } from './sources'
import type { ContentSignal, PerformancePattern, PerformanceReport } from './types'

/** Default sweeps when the user does not narrow the topic. */
const DEFAULT_QUERIES = [
  'study in Germany',
  'Germany student visa',
  'German public university admission',
  'cost of living Germany student',
]

export interface PerformanceInput {
  userId: string
  topic?: string
  limit?: number
}

/**
 * Measures which published content about Germany is doing well, using each
 * platform's own engagement counters.
 *
 * Only platforms that actually report engagement are usable here: YouTube
 * (views/likes/comments), Reddit through the authenticated API (score and
 * comment count), and Stack Exchange (score, views, answers). Reddit's keyless
 * public feed carries no counters, so it is deliberately not a source for this.
 */
export async function analysePerformance(input: PerformanceInput): Promise<PerformanceReport> {
  const store = await getStore()
  const credentials = await workspaceCredentials()
  const providers = buildSocialProviders(credentials)
  const notes: string[] = []
  const signals: ContentSignal[] = []

  const queries = input.topic?.trim() ? [input.topic.trim()] : DEFAULT_QUERIES
  const perQuery = Math.max(5, Math.ceil((input.limit ?? 24) / queries.length))

  const youtube = providers.find((p): p is YouTubeProvider => p instanceof YouTubeProvider)
  if (youtube?.status().connected) {
    for (const query of queries) {
      try {
        const videos = await youtube.searchWithStats(query, { limit: perQuery })
        signals.push(
          ...videos.map((video) => ({
            id: video.id,
            platform: 'youtube' as const,
            title: video.title,
            url: video.url,
            author: video.sourceName,
            publishedAt: video.postedAt,
            views: video.views,
            likes: video.likes,
            comments: video.comments,
            performance: 0,
            format: null,
            angle: null,
          })),
        )
      } catch (error) {
        notes.push(`YouTube: ${(error as Error).message}`)
        break
      }
    }
  } else {
    notes.push(
      'YouTube is not connected. It is the only source here that reports view counts — add a free YouTube Data API key in Settings for a much stronger signal.',
    )
  }

  const stack = providers.find((p): p is StackExchangeProvider => p instanceof StackExchangeProvider)
  if (stack) {
    for (const query of queries.slice(0, 2)) {
      try {
        const posts = await stack.discover(query, { limit: perQuery })
        signals.push(
          ...posts.map((post) => ({
            id: post.id,
            platform: 'stackexchange' as const,
            title: post.title,
            url: post.url,
            author: post.sourceName,
            publishedAt: post.postedAt,
            views: null,
            likes: post.score ?? null,
            comments: null,
            performance: 0,
            format: null,
            angle: null,
          })),
        )
      } catch (error) {
        notes.push(`Stack Exchange: ${(error as Error).message}`)
        break
      }
    }
  }

  const reddit = providers.find((p) => p.id === 'reddit')
  if (reddit?.status().connected) {
    for (const query of queries.slice(0, 2)) {
      try {
        const posts = await reddit.discover(query, { limit: perQuery })
        signals.push(
          ...posts.map((post) => ({
            id: post.id,
            platform: 'reddit' as const,
            title: post.title,
            url: post.url,
            author: post.sourceName,
            publishedAt: post.postedAt,
            views: null,
            likes: post.score ?? null,
            comments: null,
            performance: 0,
            format: null,
            angle: null,
          })),
        )
      } catch (error) {
        notes.push(`Reddit: ${(error as Error).message}`)
        break
      }
    }
  } else {
    notes.push(
      'Reddit engagement needs API credentials — the keyless public feed does not report scores. Add them in Settings to include Reddit here.',
    )
  }

  scorePerPlatform(signals)
  signals.sort((a, b) => b.performance - a.performance)

  const ai = await getAIProvider()
  let patterns: PerformancePattern[] = []
  let summary = ''

  if (!signals.length) {
    summary =
      'No published content could be measured. Connect YouTube (free) in Settings — without a source that reports engagement there is nothing to rank.'
  } else if (ai) {
    const analysis = await classify(ai, signals, input.topic ?? 'Germany study content')
    patterns = analysis.patterns
    summary = analysis.summary
    for (const signal of signals) {
      const match = analysis.labels[signal.id]
      if (match) {
        signal.format = match.format
        signal.angle = match.angle
      }
    }
  } else {
    summary = `${signals.length} pieces of content were measured and ranked. Connect an AI provider to have the patterns behind the winners explained.`
  }

  const report: PerformanceReport = {
    id: newId(),
    user_id: input.userId,
    topic: input.topic?.trim() || 'Germany study content',
    region: 'global',
    created_at: now(),
    is_demo: false,
    signals: signals.slice(0, input.limit ?? 40),
    patterns,
    formats: summariseFormats(signals),
    summary,
    source_notes: notes,
  }

  await store.insert('performance_reports', report)
  return report
}

/** Percentile-rank within each platform, so platforms stay comparable. */
function scorePerPlatform(signals: ContentSignal[]): void {
  const groups = new Map<string, ContentSignal[]>()
  for (const signal of signals) {
    const list = groups.get(signal.platform) ?? []
    list.push(signal)
    groups.set(signal.platform, list)
  }

  for (const group of groups.values()) {
    // Views where a platform reports them, otherwise its score/upvotes.
    const metric = group.map((signal) => signal.views ?? signal.likes)
    const ranked = relativePerformance(metric)
    group.forEach((signal, index) => {
      signal.performance = ranked[index]
    })
  }
}

function summariseFormats(signals: ContentSignal[]): PerformanceReport['formats'] {
  const groups = new Map<string, number[]>()
  for (const signal of signals) {
    if (!signal.format) continue
    const list = groups.get(signal.format) ?? []
    list.push(signal.performance)
    groups.set(signal.format, list)
  }

  return [...groups.entries()]
    .map(([format, scores]) => {
      const sorted = [...scores].sort((a, b) => a - b)
      const middle = Math.floor(sorted.length / 2)
      return {
        format,
        count: scores.length,
        medianPerformance:
          sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2),
      }
    })
    .sort((a, b) => b.medianPerformance - a.medianPerformance)
}

interface Classification {
  labels: Record<string, { format: string; angle: string }>
  patterns: PerformancePattern[]
  summary: string
}

async function classify(
  ai: NonNullable<Awaited<ReturnType<typeof getAIProvider>>>,
  signals: ContentSignal[],
  topic: string,
): Promise<Classification> {
  const sample = signals.slice(0, 30)
  const corpus = sample
    .map(
      (signal) =>
        `${signal.id} | ${signal.platform} | performance ${signal.performance}/100 | ${
          signal.views !== null ? `${signal.views} views` : `${signal.likes ?? 0} score`
        } | ${signal.title}`,
    )
    .join('\n')

  const raw = await ai.complete(
    [
      {
        role: 'user',
        content: `These are real published pieces about "${topic}", each with how well it performed relative to others on its own platform.

${corpus}

Do two things.

1. Label every item with a "format" (for example: explainer, personal story, myth-busting, cost breakdown, comparison, step-by-step, news reaction, Q&A, listicle) and a one-phrase "angle" describing what it promises the viewer.

2. Identify what the high performers have in common that the low performers do not. Base every claim on the items above — do not bring in outside assumptions about what performs well. If the data is too thin to support a pattern, say so instead of inventing one.

Respond as JSON:
{
  "labels": {"<id>": {"format": "...", "angle": "..."}},
  "patterns": [{"pattern": "what the winners share", "evidence": "which items show it", "recommendation": "what Bhasika should do about it"}],
  "summary": "3-4 sentences a content lead can act on"
}`,
      },
    ],
    { system: BHASIKA_SYSTEM, json: true, temperature: 0.3, maxTokens: 2600 },
  )

  const parsed = parseJson<Classification>(raw)
  return {
    labels: parsed.labels ?? {},
    patterns: parsed.patterns ?? [],
    summary: parsed.summary ?? '',
  }
}

export async function listPerformanceReports(userId: string, limit = 20): Promise<PerformanceReport[]> {
  const store = await getStore()
  return store.list<PerformanceReport>('performance_reports', { where: { user_id: userId }, limit })
}

export async function getPerformanceReport(userId: string, id: string): Promise<PerformanceReport | null> {
  const store = await getStore()
  const report = await store.get<PerformanceReport>('performance_reports', id)
  return report && report.user_id === userId ? report : null
}
