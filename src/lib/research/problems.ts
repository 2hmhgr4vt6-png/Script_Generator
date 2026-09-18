import 'server-only'
import { getAIProvider, parseJson } from '@/lib/ai'
import { getStore, newId, now } from '@/lib/db'
import { getSearchProvider } from '@/lib/search'
import { BHASIKA_SYSTEM } from '@/lib/scripts/prompts'
import { connectedSocialProviders, socialStatuses, type SocialPost } from '@/lib/social'
import type { AudienceProblem, ProblemAnalysis, TopicCategory } from '@/lib/types'
import { classifyCategory, detectLanguage, domainOf, looksLikeQuestion } from './classify'
import { demoProblems } from './demo'

/** Default sweeps run when the user does not supply a keyword. */
const DEFAULT_QUERIES = [
  'study in Germany Nepali student confused admission',
  'German public university tuition fee semester contribution question',
  'Germany student visa blocked account Nepal question',
  'uni-assist anabin degree recognition help',
  'IELTS requirement German university rejected',
  'HiWi Werkstudent student job Germany hours',
]

export interface DiscoverInput {
  userId: string
  keyword?: string
  sources?: string[]
  limit?: number
}

export interface DiscoverOutcome {
  problems: AudienceProblem[]
  isDemo: boolean
  sourceStatuses: Awaited<ReturnType<typeof socialStatuses>>
  notes: string[]
}

/**
 * Sweeps connected social sources and the web for question-shaped posts, then
 * stores them as audience problems with their original source links intact.
 */
export async function discoverProblems(input: DiscoverInput): Promise<DiscoverOutcome> {
  const store = await getStore()
  const [statuses, connected, search] = await Promise.all([
    socialStatuses(),
    connectedSocialProviders(),
    getSearchProvider(),
  ])
  const providers = connected.filter((p) => !input.sources?.length || input.sources.includes(p.id))
  const notes: string[] = []

  const queries = input.keyword ? [input.keyword] : DEFAULT_QUERIES
  const posts: SocialPost[] = []

  for (const provider of providers) {
    for (const query of queries.slice(0, 3)) {
      try {
        posts.push(...(await provider.discover(query, { limit: input.limit ?? 12 })))
      } catch (error) {
        notes.push(`${provider.label}: ${(error as Error).message}`)
      }
    }
  }

  if (search) {
    for (const query of queries.slice(0, 3)) {
      try {
        const results = await search.search(`${query} forum OR reddit OR discussion`, { limit: 6 })
        posts.push(
          ...results.map((result) => ({
            id: `web:${result.url}`,
            platform: domainOf(result.url).includes('reddit') ? 'reddit' : 'web',
            sourceName: domainOf(result.url),
            title: result.title,
            excerpt: result.snippet,
            url: result.url,
            postedAt: result.publishedAt ?? null,
          })),
        )
      } catch (error) {
        notes.push(`Web search: ${(error as Error).message}`)
      }
    }
  }

  if (!providers.length && !search) {
    const demo = demoProblems(input.userId, input.keyword)
    for (const problem of demo) await store.insert('audience_problems', problem)
    return {
      problems: demo,
      isDemo: true,
      sourceStatuses: statuses,
      notes: ['No search or social provider is connected, so sample problems were generated. Add API keys in Settings.'],
    }
  }

  const existing = await store.list<AudienceProblem>('audience_problems', { where: { user_id: input.userId } })
  const knownUrls = new Set(existing.map((p) => p.source_url))

  const candidates = posts
    .filter((post) => looksLikeQuestion(`${post.title} ${post.excerpt}`))
    .filter((post) => !knownUrls.has(post.url))
    .filter((post, index, all) => all.findIndex((p) => p.url === post.url) === index)
    .slice(0, input.limit ?? 24)

  const problems: AudienceProblem[] = candidates
    .map((post) => {
      const text = `${post.title} ${post.excerpt}`
      return { post, text, relevance: relevanceOf(text) }
    })
    // A broad sweep pulls in unrelated posts that merely look like questions;
    // anything with no topical overlap is dropped rather than stored as noise.
    .filter((candidate) => candidate.relevance >= MINIMUM_RELEVANCE)
    .map(({ post, text, relevance }) => ({
      id: newId(),
      user_id: input.userId,
      session_id: null,
      title: post.title.slice(0, 200),
      excerpt: post.excerpt.slice(0, 1000) || post.title,
      platform: post.platform,
      source_name: post.sourceName,
      source_url: post.url,
      retrieved_at: now(),
      posted_at: post.postedAt,
      category: classifyCategory(text) as TopicCategory,
      language: detectLanguage(text),
      relevance,
      status: 'new' as const,
      analysis: null,
      related_questions: [],
      is_demo: false,
      created_at: now(),
      updated_at: now(),
    }))

  for (const problem of problems) await store.insert('audience_problems', problem)

  await store.insert('scheduled_syncs', {
    id: newId(),
    user_id: input.userId,
    source: providers.map((p) => p.id).join(',') || 'web',
    frequency: 'off',
    cron: null,
    last_run_at: now(),
    last_status: `${problems.length} new problems`,
    created_at: now(),
    updated_at: now(),
  })

  return { problems, isDemo: false, sourceStatuses: statuses, notes }
}

const RELEVANT_TERMS = [
  'germany', 'german', 'daad', 'uni-assist', 'anabin', 'ects', 'ielts', 'visa', 'blocked account',
  'studienkolleg', 'hiwi', 'werkstudent', 'nepal', 'nepali', 'semester', 'aps', 'study abroad',
  'university', 'admission', 'scholarship', 'tuition', 'student',
]

/** Matching no topical term at all means the post is not about Bhasika's subject. */
const MINIMUM_RELEVANCE = 52

function relevanceOf(text: string): number {
  const lower = text.toLowerCase()
  const hits = RELEVANT_TERMS.filter((term) => lower.includes(term)).length
  return hits === 0 ? 0 : Math.min(98, 40 + hits * 12)
}

/** Deeper AI pass used on the problem detail page. */
export async function analyseProblem(problem: AudienceProblem): Promise<{
  analysis: ProblemAnalysis
  relatedQuestions: string[]
  isDemo: boolean
}> {
  const ai = await getAIProvider()
  if (!ai) {
    return {
      analysis: problem.analysis ?? {
        confusion: 'Connect an AI provider to analyse this problem automatically.',
        situation: problem.excerpt.slice(0, 220),
        misconception: 'Not analysed — no AI provider configured.',
        information_needed: 'Not analysed — no AI provider configured.',
        takeaway: 'Not analysed — no AI provider configured.',
        why_it_matters: 'Not analysed — no AI provider configured.',
        content_angles: [],
      },
      relatedQuestions: problem.related_questions,
      isDemo: true,
    }
  }

  const raw = await ai.complete(
    [
      {
        role: 'user',
        content: `A Bhasika researcher found this question online.

Title: ${problem.title}
In their words: ${problem.excerpt}
Platform: ${problem.platform} (${problem.source_name})
Link: ${problem.source_url}

Analyse it for a scriptwriter. Do not answer the question with facts you are not certain of — describe what information would be needed and which official source would settle it.

Respond as JSON:
{
  "confusion": "what the audience is confused about",
  "situation": "the situation they are in",
  "misconception": "the misconception that may exist",
  "information_needed": "what information answers this, and which official source holds it",
  "takeaway": "what the viewer should understand after watching",
  "why_it_matters": "why this matters to Bhasika's audience",
  "content_angles": ["3-5 angles Bhasika could take"],
  "related_questions": ["3-5 questions the same viewer will ask next"]
}`,
      },
    ],
    { system: BHASIKA_SYSTEM, json: true, temperature: 0.5, maxTokens: 1200 },
  )

  const parsed = parseJson<ProblemAnalysis & { related_questions?: string[] }>(raw)
  return {
    analysis: {
      confusion: parsed.confusion ?? '',
      situation: parsed.situation ?? '',
      misconception: parsed.misconception ?? '',
      information_needed: parsed.information_needed ?? '',
      takeaway: parsed.takeaway ?? '',
      why_it_matters: parsed.why_it_matters ?? '',
      content_angles: parsed.content_angles ?? [],
    },
    relatedQuestions: parsed.related_questions ?? [],
    isDemo: false,
  }
}
