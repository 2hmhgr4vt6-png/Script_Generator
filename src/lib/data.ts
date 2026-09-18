import 'server-only'
import { getStore } from '@/lib/db'
import type {
  AudienceProblem, Idea, ResearchSession, ResearchSource, Script, ScriptVersion, UserPreferences,
} from '@/lib/types'

/** Read helpers shared by the server components. Every one is scoped by user_id. */

export async function listIdeas(userId: string, limit = 50): Promise<Idea[]> {
  const store = await getStore()
  return store.list<Idea>('ideas', { where: { user_id: userId }, limit })
}

export async function getIdea(userId: string, id: string): Promise<Idea | null> {
  const store = await getStore()
  const idea = await store.get<Idea>('ideas', id)
  return idea && idea.user_id === userId ? idea : null
}

export async function listResearchSessions(userId: string, limit = 30): Promise<ResearchSession[]> {
  const store = await getStore()
  return store.list<ResearchSession>('research_sessions', { where: { user_id: userId }, limit })
}

export async function getResearchSession(userId: string, id: string) {
  const store = await getStore()
  const session = await store.get<ResearchSession>('research_sessions', id)
  if (!session || session.user_id !== userId) return null
  const sources = await store.list<ResearchSource>('research_sources', {
    where: { session_id: id },
    orderBy: 'relevance',
  })
  return { session, sources }
}

export async function listProblems(
  userId: string,
  filters: Partial<Pick<AudienceProblem, 'category' | 'platform' | 'status' | 'language'>> & { q?: string } = {},
  limit = 100,
): Promise<AudienceProblem[]> {
  const store = await getStore()
  const where: Record<string, unknown> = { user_id: userId }
  for (const key of ['category', 'platform', 'status', 'language'] as const) {
    if (filters[key]) where[key] = filters[key]
  }
  return store.list<AudienceProblem>('audience_problems', {
    where,
    search: filters.q ? { columns: ['title', 'excerpt'], term: filters.q } : undefined,
    limit,
  })
}

export async function getProblem(userId: string, id: string): Promise<AudienceProblem | null> {
  const store = await getStore()
  const problem = await store.get<AudienceProblem>('audience_problems', id)
  return problem && problem.user_id === userId ? problem : null
}

export interface ScriptFilters {
  q?: string
  language?: string
  category?: string
  platform?: string
  status?: string
  duration?: string
}

export async function listScripts(userId: string, filters: ScriptFilters = {}, limit = 200): Promise<Script[]> {
  const store = await getStore()
  const where: Record<string, unknown> = { user_id: userId }
  if (filters.language) where.language = filters.language
  if (filters.category) where.category = filters.category
  if (filters.platform) where.platform = filters.platform
  if (filters.status) where.status = filters.status
  if (filters.duration) where.duration_seconds = Number(filters.duration)

  return store.list<Script>('scripts', {
    where,
    search: filters.q ? { columns: ['title'], term: filters.q } : undefined,
    orderBy: 'updated_at',
    limit,
  })
}

export async function getScript(userId: string, id: string): Promise<Script | null> {
  const store = await getStore()
  const script = await store.get<Script>('scripts', id)
  return script && script.user_id === userId ? script : null
}

export async function listVersions(scriptId: string): Promise<ScriptVersion[]> {
  const store = await getStore()
  return store.list<ScriptVersion>('script_versions', { where: { script_id: scriptId }, orderBy: 'version', direction: 'desc' })
}

export async function getPreferences(userId: string): Promise<UserPreferences | null> {
  const store = await getStore()
  return store.findOne<UserPreferences>('user_preferences', { user_id: userId })
}

export interface DashboardStats {
  ideas: number
  problems: number
  scripts: number
  saved: number
}

export async function getDashboardData(userId: string) {
  const store = await getStore()
  const [ideas, problems, scripts, sessions] = await Promise.all([
    store.list<Idea>('ideas', { where: { user_id: userId }, limit: 6 }),
    store.list<AudienceProblem>('audience_problems', { where: { user_id: userId }, limit: 6 }),
    store.list<Script>('scripts', { where: { user_id: userId }, orderBy: 'updated_at', limit: 6 }),
    store.list<ResearchSession>('research_sessions', { where: { user_id: userId }, limit: 5 }),
  ])
  const [ideaCount, problemCount, scriptCount, savedCount] = await Promise.all([
    store.count('ideas', { user_id: userId }),
    store.count('audience_problems', { user_id: userId }),
    store.count('scripts', { user_id: userId }),
    store.count('scripts', { user_id: userId, status: 'ready' }),
  ])

  // Trending topics are counted from the user's own research and discovered
  // problems — never invented engagement numbers.
  const allProblems = await store.list<AudienceProblem>('audience_problems', { where: { user_id: userId }, limit: 500 })
  const counts = new Map<string, number>()
  for (const problem of allProblems) counts.set(problem.category, (counts.get(problem.category) ?? 0) + 1)
  const trending = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7)

  return {
    stats: { ideas: ideaCount, problems: problemCount, scripts: scriptCount, saved: savedCount } as DashboardStats,
    recentIdeas: ideas,
    recentProblems: problems,
    recentScripts: scripts,
    recentSessions: sessions,
    trending,
    hasRealData: allProblems.some((p) => !p.is_demo),
  }
}
