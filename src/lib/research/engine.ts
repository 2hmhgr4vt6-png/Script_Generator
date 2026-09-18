import 'server-only'
import { getAIProvider, parseJson } from '@/lib/ai'
import { getStore, newId, now } from '@/lib/db'
import { getSearchProvider, type SearchResult } from '@/lib/search'
import { BHASIKA_SYSTEM } from '@/lib/scripts/prompts'
import type { Idea, ResearchFact, ResearchSession, ResearchSource } from '@/lib/types'
import { baseRelevance, classifySource, defaultVerification, domainOf } from './classify'
import { demoResearch } from './demo'

/** Domains prioritised for Germany study questions. */
const PRIORITY_DOMAINS = [
  'daad.de', 'study-in-germany.de', 'make-it-in-germany.com', 'uni-assist.de', 'anabin.kmk.org',
  'auswaertiges-amt.de', 'kathmandu.diplo.de', 'hochschulkompass.de',
]

export interface RunResearchInput {
  userId: string
  text: string
  idea?: Idea | null
  includeCommunity?: boolean
}

export interface ResearchOutcome {
  session: ResearchSession
  sources: ResearchSource[]
}

/**
 * Full research pass: plan queries, search, classify, then extract facts.
 *
 * Without a search key the pass runs in demo mode and every row it writes is
 * flagged is_demo so the UI can label it as sample content.
 */
export async function runResearch(input: RunResearchInput): Promise<ResearchOutcome> {
  const store = await getStore()
  const [ai, search] = await Promise.all([getAIProvider(), getSearchProvider()])
  const sessionId = newId()
  const timestamp = now()

  const session: ResearchSession = {
    id: sessionId,
    user_id: input.userId,
    idea_id: input.idea?.id ?? null,
    query: input.text,
    status: 'searching',
    provider: search?.name ?? 'demo',
    is_demo: !search,
    queries: [],
    facts: [],
    conflicts: [],
    summary: '',
    error: null,
    created_at: timestamp,
    updated_at: timestamp,
  }
  await store.insert('research_sessions', session)

  if (!search) {
    const demo = demoResearch(input.text, input.userId, sessionId)
    for (const source of demo.sources) await store.insert('research_sources', source)
    const updated = await store.update<ResearchSession>('research_sessions', sessionId, {
      status: 'complete',
      queries: demo.queries,
      facts: demo.facts,
      conflicts: demo.conflicts,
      summary: demo.summary,
      updated_at: now(),
    })
    return { session: updated ?? session, sources: demo.sources }
  }

  try {
    const queries = await planQueries(input.text)
    await store.update('research_sessions', sessionId, { queries, status: 'reading', updated_at: now() })

    const { results, errors } = await gatherResults(queries, search, input.includeCommunity ?? true)

    // Every query failing means the provider is misconfigured or down. Surfacing
    // the provider's own message beats reporting an empty but successful search.
    if (!results.length && errors.length) throw errors[0]

    if (!results.length) {
      const updated = await store.update<ResearchSession>('research_sessions', sessionId, {
        status: 'complete',
        summary: 'No relevant sources were found for this idea. Try rephrasing it with more specific terms.',
        updated_at: now(),
      })
      return { session: updated ?? session, sources: [] }
    }

    const sources: ResearchSource[] = results.map((result) => {
      const sourceType = classifySource(result.url)
      return {
        id: newId(),
        user_id: input.userId,
        session_id: sessionId,
        title: result.title,
        url: result.url,
        domain: domainOf(result.url),
        excerpt: result.snippet.slice(0, 1200),
        published_at: result.publishedAt ?? null,
        source_type: sourceType,
        relevance: Math.min(99, Math.round(baseRelevance(sourceType) * (result.score ? 0.6 + result.score * 0.4 : 1))),
        verification: defaultVerification(sourceType),
        selected: sourceType === 'official' || sourceType === 'government' || sourceType === 'university',
        is_demo: false,
        created_at: now(),
      }
    })
    sources.sort((a, b) => b.relevance - a.relevance)
    for (const source of sources) await store.insert('research_sources', source)

    await store.update('research_sessions', sessionId, { status: 'extracting', updated_at: now() })

    let facts: ResearchFact[] = []
    let conflicts: string[] = []
    let summary = ''

    if (ai) {
      const extraction = await extractFacts(ai, input.text, sources)
      facts = extraction.facts
      conflicts = extraction.conflicts
      summary = extraction.summary
    } else {
      summary =
        'Sources were retrieved, but no AI provider is configured, so facts were not extracted automatically. ' +
        'Add OPENAI_API_KEY or ANTHROPIC_API_KEY in Settings to enable fact extraction.'
    }

    if (errors.length) {
      summary = `${summary}\n\nNote: ${errors.length} search request(s) failed — ${errors[0].message} Results may be incomplete.`.trim()
    }

    const updated = await store.update<ResearchSession>('research_sessions', sessionId, {
      status: 'complete',
      facts,
      conflicts,
      summary,
      updated_at: now(),
    })
    return { session: updated ?? session, sources }
  } catch (error) {
    const message = (error as Error).message
    const updated = await store.update<ResearchSession>('research_sessions', sessionId, {
      status: 'error',
      error: message,
      updated_at: now(),
    })
    return { session: updated ?? session, sources: [] }
  }
}

async function planQueries(text: string): Promise<string[]> {
  const ai = await getAIProvider()
  if (ai) {
    try {
      const raw = await ai.complete(
        [
          {
            role: 'user',
            content: `Turn this raw content idea into 3 to 4 web search queries that would find authoritative information for Nepali students planning to study in Germany.

Raw idea: "${text}"

Prefer wording that surfaces official sources (DAAD, study-in-germany.de, uni-assist, anabin, embassy, Make it in Germany). Include one query aimed at what students themselves are asking about it.

Respond as JSON: {"queries": ["...", "..."]}`,
          },
        ],
        { system: BHASIKA_SYSTEM, json: true, temperature: 0.4, maxTokens: 400 },
      )
      const parsed = parseJson<{ queries?: string[] }>(raw)
      const queries = (parsed.queries ?? []).filter((q) => typeof q === 'string' && q.trim()).slice(0, 4)
      if (queries.length) return queries
    } catch {
      // Fall through to the heuristic planner below.
    }
  }
  const base = text.replace(/\s+/g, ' ').trim().slice(0, 160)
  return [base, `${base} official requirements Germany`, `${base} Nepali students experience`]
}

async function gatherResults(
  queries: string[],
  search: NonNullable<Awaited<ReturnType<typeof getSearchProvider>>>,
  includeCommunity: boolean,
): Promise<{ results: SearchResult[]; errors: Error[] }> {
  const batches = await Promise.allSettled([
    ...queries.map((query) => search.search(query, { limit: 6 })),
    search.search(queries[0], { limit: 5, includeDomains: PRIORITY_DOMAINS }),
  ])

  const seen = new Set<string>()
  const results: SearchResult[] = []
  const errors: Error[] = []
  for (const batch of batches) {
    if (batch.status !== 'fulfilled') {
      errors.push(batch.reason instanceof Error ? batch.reason : new Error(String(batch.reason)))
      continue
    }
    for (const result of batch.value) {
      const key = result.url.split('#')[0]
      if (seen.has(key)) continue
      const type = classifySource(result.url)
      if (!includeCommunity && (type === 'community' || type === 'social')) continue
      seen.add(key)
      results.push(result)
    }
  }
  return { results: results.slice(0, 20), errors }
}

interface Extraction {
  facts: ResearchFact[]
  conflicts: string[]
  summary: string
}

async function extractFacts(
  ai: NonNullable<Awaited<ReturnType<typeof getAIProvider>>>,
  idea: string,
  sources: ResearchSource[],
): Promise<Extraction> {
  const corpus = sources
    .slice(0, 12)
    .map((s, i) => `[${i + 1}] ${s.title} (${s.domain}, type: ${s.source_type})\nURL: ${s.url}\n${s.excerpt.slice(0, 800)}`)
    .join('\n\n')

  const raw = await ai.complete(
    [
      {
        role: 'user',
        content: `Read these search results and extract what is actually usable for a Bhasika video about: "${idea}".

${corpus}

Rules:
- Only state what the extracts support. Never add outside knowledge as a fact.
- Mark anything from a forum, Reddit, blog or social source as an opinion, not a fact.
- If two sources disagree, record it under "conflicts".
- Assign each claim a status from: verified-by-source, needs-verification, conflicting-sources, opinion, not-enough-information.

Respond as JSON:
{
  "facts": [{"claim": "...", "source_index": 1, "status": "verified-by-source", "kind": "fact", "note": "optional caveat"}],
  "conflicts": ["..."],
  "summary": "3-4 sentences a scriptwriter can act on."
}`,
      },
    ],
    { system: BHASIKA_SYSTEM, json: true, temperature: 0.2, maxTokens: 1800 },
  )

  const parsed = parseJson<{
    facts?: { claim: string; source_index?: number; status?: string; kind?: string; note?: string }[]
    conflicts?: string[]
    summary?: string
  }>(raw)

  const facts: ResearchFact[] = (parsed.facts ?? []).map((fact) => {
    const source = typeof fact.source_index === 'number' ? sources[fact.source_index - 1] : undefined
    return {
      claim: fact.claim,
      source_url: source?.url ?? null,
      source_title: source?.title ?? null,
      status: (fact.status as ResearchFact['status']) ?? 'needs-verification',
      kind: fact.kind === 'opinion' ? 'opinion' : 'fact',
      note: fact.note,
    }
  })

  return {
    facts,
    conflicts: parsed.conflicts ?? [],
    summary: parsed.summary ?? '',
  }
}
