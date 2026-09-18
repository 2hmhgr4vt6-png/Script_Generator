import 'server-only'
import { getStore, newId, now } from '@/lib/db'
import type { BehaviorEvent, HookStyle, Language, Script, TopicCategory, UserPreferences } from '@/lib/types'
import { TOPIC_CATEGORIES } from '@/lib/types'

/**
 * Rule-based preference tracking. This is deliberately not machine learning:
 * it counts what the user actually does and ranks it. No external service ever
 * sees this data, and the user can switch it off or delete it in Settings.
 */

export type LearnableEvent =
  | 'idea.created'
  | 'research.run'
  | 'problem.saved'
  | 'hook.selected'
  | 'script.generated'
  | 'script.edited'
  | 'script.exported'
  | 'ai.action'

export async function recordEvent(
  userId: string,
  type: LearnableEvent,
  payload: Record<string, unknown> = {},
): Promise<void> {
  const store = await getStore()
  const prefs = await store.findOne<UserPreferences>('user_preferences', { user_id: userId })
  if (prefs && !prefs.learning_enabled) return

  await store.insert('behavior_events', {
    id: newId(),
    user_id: userId,
    type,
    payload,
    created_at: now(),
  } satisfies BehaviorEvent)
}

export interface Insights {
  enabled: boolean
  eventCount: number
  topTopics: { category: TopicCategory; label: string; count: number }[]
  favouriteHookStyle: { style: HookStyle; count: number } | null
  preferredLanguage: { language: Language; count: number } | null
  mostUsedDuration: { seconds: number; count: number } | null
  topAiActions: { action: string; count: number }[]
  suggestedCta: string | null
  recommendedTopics: string[]
  reason: string | null
}

export async function getInsights(userId: string): Promise<Insights> {
  const store = await getStore()
  const prefs = await store.findOne<UserPreferences>('user_preferences', { user_id: userId })
  const enabled = prefs?.learning_enabled ?? true

  const empty: Insights = {
    enabled,
    eventCount: 0,
    topTopics: [],
    favouriteHookStyle: null,
    preferredLanguage: null,
    mostUsedDuration: null,
    topAiActions: [],
    suggestedCta: null,
    recommendedTopics: [],
    reason: null,
  }
  if (!enabled) return empty

  const [events, scripts] = await Promise.all([
    store.list<BehaviorEvent>('behavior_events', { where: { user_id: userId }, limit: 1000 }),
    store.list<Script>('scripts', { where: { user_id: userId }, limit: 500 }),
  ])
  if (!events.length && !scripts.length) return empty

  const topics = tally(scripts.map((s) => s.category))
  const languages = tally(scripts.map((s) => s.language))
  const durations = tally(scripts.map((s) => String(s.duration_seconds)))
  const hookStyles = tally(
    events.filter((e) => e.type === 'hook.selected').map((e) => String(e.payload.style ?? 'situation')),
  )
  const aiActions = tally(events.filter((e) => e.type === 'ai.action').map((e) => String(e.payload.action ?? '')))

  const topTopics = topics.slice(0, 4).map(([category, count]) => ({
    category: category as TopicCategory,
    label: TOPIC_CATEGORIES.find((t) => t.value === category)?.label ?? category,
    count,
  }))

  return {
    enabled,
    eventCount: events.length,
    topTopics,
    favouriteHookStyle: hookStyles[0] ? { style: hookStyles[0][0] as HookStyle, count: hookStyles[0][1] } : null,
    preferredLanguage: languages[0] ? { language: languages[0][0] as Language, count: languages[0][1] } : null,
    mostUsedDuration: durations[0] ? { seconds: Number(durations[0][0]), count: durations[0][1] } : null,
    topAiActions: aiActions.slice(0, 3).map(([action, count]) => ({ action, count })),
    suggestedCta: suggestCta(topTopics[0]?.category),
    recommendedTopics: recommendTopics(topTopics.map((t) => t.category)),
    reason: topTopics[0]
      ? `Because you frequently create ${topTopics[0].label.toLowerCase()} content…`
      : null,
  }
}

function tally(values: string[]): [string, number][] {
  const counts = new Map<string, number>()
  for (const value of values) {
    if (!value) continue
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])
}

const CTA_BY_TOPIC: Partial<Record<TopicCategory, string>> = {
  admission: 'Confused about your Germany admission? Ask Bhasika — no name needed.',
  visa: 'Visa questions? Comment yours and we will explain it in the next video.',
  tuition: 'Planning your budget? Save this and check the official page before you decide.',
  eligibility: 'Not sure your degree counts? Ask Bhasika. We explain. You decide.',
  'student-jobs': 'Working out your money plan? Comment your situation.',
  language: 'Still unsure which certificate you need? Ask Bhasika.',
}

function suggestCta(category?: TopicCategory): string | null {
  if (!category) return null
  return CTA_BY_TOPIC[category] ?? 'We explain. You decide. Visit www.bhasika.com'
}

const NEXT_TOPICS: Partial<Record<TopicCategory, string[]>> = {
  admission: ['Reading a rejection letter properly', 'Uni-assist step by step', 'Winter vs summer intake timing'],
  visa: ['What to prepare while you wait for a decision', 'Blocked account basics', 'Documents the embassy actually checks'],
  tuition: ['Semester contribution explained', 'A realistic first-semester budget', 'Which states charge what'],
  eligibility: ['Checking your degree on anabin', 'What "subject-related" means', 'When a Studienkolleg applies'],
  language: ['IELTS vs TestDaF vs Goethe', 'When German is actually required', 'Language plan alongside your application'],
  'student-jobs': ['HiWi vs Werkstudent vs Minijob', 'The work-day limit explained', 'Balancing work and study load'],
  'cost-of-living': ['City-by-city cost comparison', 'Finding student housing early', 'Health insurance explained'],
}

function recommendTopics(categories: TopicCategory[]): string[] {
  const out: string[] = []
  for (const category of categories) {
    out.push(...(NEXT_TOPICS[category] ?? []))
  }
  if (!out.length) {
    out.push('Germany public university admission basics', 'ECTS and eligibility explained', 'Student visa timeline')
  }
  return [...new Set(out)].slice(0, 6)
}

export async function clearLearningData(userId: string): Promise<number> {
  const store = await getStore()
  return store.removeWhere('behavior_events', { user_id: userId })
}
